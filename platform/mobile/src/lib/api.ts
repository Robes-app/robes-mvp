import { authClient } from './auth-client';
import { API_URL, APP_VERSION } from './config';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Calls /api/v1 with the session cookie from SecureStore and the app version (for 426 upgrades).
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const cookie = await authClient.getCookie();
  if (cookie) headers.set('cookie', cookie);
  headers.set('x-robes-app-version', APP_VERSION);
  if (init.body) headers.set('content-type', 'application/json');
  const res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) {
    const error = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiRequestError(res.status, error?.code ?? 'internal', error?.message ?? '');
  }
  return body as T;
}
