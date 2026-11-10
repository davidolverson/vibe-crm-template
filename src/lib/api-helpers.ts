import { NextResponse } from 'next/server';
import { getAuthContext, type AuthContext } from './auth';

/**
 * Wraps an API route handler with auth + error handling.
 * Returns the AuthContext to the handler function.
 */
export async function withApiAuth<T>(
  handler: (ctx: AuthContext) => Promise<T>,
): Promise<NextResponse> {
  try {
    const ctx = await getAuthContext();
    const data = await handler(ctx);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = (err as { status?: number }).status || 500;

    if (status === 500) {
      console.error('[API]', message);
    }

    return NextResponse.json(
      { error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
