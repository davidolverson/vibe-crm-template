import { NextRequest } from 'next/server';

/**
 * Validate that the request Origin (or Referer) matches our app URL.
 * Returns true if the origin is valid, false if it looks like a cross-site request.
 */
export function validateOrigin(request: NextRequest): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    // If APP_URL isn't set, skip CSRF check (dev safety net).
    // In production this env var must always be set.
    return true;
  }

  let appOrigin: string;
  try {
    appOrigin = new URL(appUrl).origin;
  } catch {
    return true; // malformed env var, don't block
  }

  // Check Origin header first (most reliable), fall back to Referer
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin) {
    return origin === appOrigin;
  }

  if (referer) {
    try {
      return new URL(referer).origin === appOrigin;
    } catch {
      return false;
    }
  }

  // No Origin or Referer -- likely a same-origin request from older browsers
  // or server-side. Allow it; Better Auth handles its own CSRF for auth routes.
  return true;
}
