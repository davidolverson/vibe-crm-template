import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

// Public routes matched EXACTLY. `/` here was previously in the prefix list,
// which made startsWith('/') return true for every path -- a full auth bypass
// at the middleware layer. Keep these tight.
const PUBLIC_EXACT = new Set<string>([
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/contact',
  '/privacy',
  '/terms',
  '/founding-50',
  '/demo',
  '/changelog',
  '/offline',
  '/api/health',
  '/api/ping',
  '/api/waitlist',
  '/api/contact',
  '/api/checkout/founding',
  '/api/unsubscribe',
  '/api/sites/track',
  '/api/qbo/callback',
  '/manifest.webmanifest',
  '/sw.js',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
  '/twitter-image',
  '/icon',
  '/apple-icon',
  '/favicon.ico',
]);

// Prefixes that mark a route family as public. All include a trailing slash to
// avoid accidental matches like /sign-in-bad matching /sign-in.
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/forms/',
  '/api/webhooks/',
  '/api/cron/',
  '/api/partner/',
  '/api/marketing/',
  '/partner/',
  '/s/', // hosted public form pages
  '/p/', // public site pages (Phase 5)
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Extract client IP from request headers */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// Routes that skip CSRF origin check (webhooks, public form submissions, cron)
const CSRF_EXEMPT_PREFIXES = [
  '/api/webhooks/',
  '/api/forms/',
  '/api/cron/',
  '/api/auth/',      // Better Auth handles its own CSRF
  '/api/health',
  '/api/ping',
  '/api/waitlist',   // public marketing form
  '/api/contact',    // public marketing form
  '/api/partner/',
  '/api/unsubscribe',
  '/api/qbo/callback',
  '/api/marketing/',
  '/api/sites/track',
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // ── Rate limiting on auth routes ──────────────────────────────────
  // Sign-in / sign-up pages: 10 req/min per IP
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
    const { success } = rateLimit(`auth-page:${ip}`, 10, 60_000);
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // Auth API endpoints: 20 req/min per IP
  if (pathname.startsWith('/api/auth/')) {
    const { success } = rateLimit(`auth-api:${ip}`, 20, 60_000);
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // ── CSRF origin check for mutating requests ──────────────────────
  const method = req.method;
  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    method !== 'OPTIONS' &&
    !isCsrfExempt(pathname)
  ) {
    if (!validateOrigin(req)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // ── Standard auth + routing logic ─────────────────────────────────
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  const sessionToken = req.cookies.get('better-auth.session_token')?.value;
  if (!sessionToken) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Verify active organization exists in session for app routes. `isPublicRoute`
  // above already filtered out marketing + auth pages, so anything reaching here
  // is an authed app route. Still skip /onboarding itself so the user can land.
  const activeOrgId = req.cookies.get('better-auth.active_organization')?.value;
  if (!activeOrgId && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
