import { type NextRequest, NextResponse } from 'next/server';
import { buildCsp } from './server/security-headers';

export function proxy(request: NextRequest) {
  // Fail closed: a missing URL would silently ship a CSP pointing at the wrong backend.
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not set');
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({ nonce, isDev: process.env.NODE_ENV !== 'production', supabaseUrl });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico).*)' }],
};
