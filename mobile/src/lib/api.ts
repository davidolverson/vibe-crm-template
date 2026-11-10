import { useAuth } from '../../app/_layout';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://example.com';

type FetchOptions = RequestInit & { token?: string };

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Hook that returns an authenticated fetch function.
 * Uses Better Auth session token for API authorization.
 */
export function useApiFetch() {
  const { sessionToken } = useAuth();

  return async function <T>(path: string, options: RequestInit = {}): Promise<T> {
    return apiFetch<T>(path, { ...options, token: sessionToken ?? undefined });
  };
}
