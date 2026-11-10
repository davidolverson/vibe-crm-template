export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, verifyOAuthState } from '@/lib/qbo';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get('code');
  const realmId = req.nextUrl.searchParams.get('realmId');
  const state = req.nextUrl.searchParams.get('state');

  if (!code || !realmId || !state) {
    return NextResponse.redirect(new URL('/settings/quickbooks?error=missing_params', req.url));
  }

  const tenantId = verifyOAuthState(state);
  if (!tenantId) {
    return NextResponse.redirect(new URL('/settings/quickbooks?error=invalid_state', req.url));
  }

  try {
    await exchangeCodeForTokens(code, realmId, tenantId);
  } catch (err) {
    console.error('[qbo-callback]', err);
    const msg = encodeURIComponent(err instanceof Error ? err.message : 'connect_failed');
    return NextResponse.redirect(new URL(`/settings/quickbooks?error=${msg}`, req.url));
  }

  return NextResponse.redirect(new URL('/settings/quickbooks?connected=true', req.url));
}
