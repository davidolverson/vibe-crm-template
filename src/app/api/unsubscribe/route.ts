export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { markEmailUnsubscribed, verifyUnsubscribeToken } from '@/lib/unsubscribe';

const CACHE_HEADERS = { 'Cache-Control': 'no-store' } as const;

function htmlResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...CACHE_HEADERS },
  });
}

function page(title: string, message: string): string {
  const safeTitle = title.replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c),
  );
  const safeMessage = message.replace(/[<>&]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c),
  );
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${safeTitle} -- VIBE</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
           font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
           background: #0A0A0F; color: #FAFAFA; padding: 2rem; text-align: center; }
    .wrap { max-width: 480px; }
    h1 { font-size: 2rem; color: #D4A017; margin: 0 0 1rem; font-weight: 600; }
    p { color: #A1A1AA; line-height: 1.55; margin: 0 0 1.5rem; }
    a { color: #D4A017; text-decoration: none; border-bottom: 1px solid rgba(212,160,23,0.4); }
    a:hover { border-color: #D4A017; }
    .note { font-size: 0.85rem; color: #71717A; margin-top: 2rem; }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    <p class="note"><a href="https://example.com">Back to example.com</a></p>
  </main>
</body>
</html>`;
}

async function handle(email: string, token: string): Promise<{ ok: boolean; status: number; message: string; affected: number }> {
  if (!email || !token) {
    return { ok: false, status: 400, message: 'Missing email or token.', affected: 0 };
  }
  if (!verifyUnsubscribeToken(email, token)) {
    return { ok: false, status: 400, message: 'This unsubscribe link is invalid or has expired.', affected: 0 };
  }
  try {
    const { affected } = await markEmailUnsubscribed(email);
    return {
      ok: true,
      status: 200,
      message: affected > 0
        ? 'You have been unsubscribed. You will not receive any further marketing emails from VIBE.'
        : 'This email was already unsubscribed (or never subscribed). Nothing to do.',
      affected,
    };
  } catch (err) {
    console.error('[unsubscribe] failed:', err);
    return { ok: false, status: 500, message: 'Something went wrong on our side. Try again in a minute, or email hello@example.com.', affected: 0 };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get('email') ?? '';
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const { ok, status, message } = await handle(email, token);
  const title = ok ? 'You are unsubscribed' : 'Unsubscribe failed';
  return htmlResponse(page(title, message), status);
}

// Handles the mailto one-click flow per RFC 8058 (List-Unsubscribe-Post: List-Unsubscribe=One-Click).
export async function POST(req: NextRequest): Promise<NextResponse> {
  let email = '';
  let token = '';

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    email = String(form.get('email') ?? '');
    token = String(form.get('token') ?? '');
  } else if (contentType.includes('application/json')) {
    try {
      const body = (await req.json()) as { email?: string; token?: string };
      email = body.email ?? '';
      token = body.token ?? '';
    } catch {
      // fall through to query-string fallback
    }
  }

  if (!email) email = req.nextUrl.searchParams.get('email') ?? '';
  if (!token) token = req.nextUrl.searchParams.get('token') ?? '';

  const { ok, status, message, affected } = await handle(email, token);
  return NextResponse.json({ ok, affected, message }, { status, headers: CACHE_HEADERS });
}
