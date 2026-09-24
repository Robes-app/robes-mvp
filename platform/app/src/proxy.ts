import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from './server/env';
import { isAuthPage, isProtectedPath } from './server/guards';
import { buildCsp, cspSources } from './server/security-headers';

const sources = cspSources(env.media, env.observability);

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set('content-security-policy', csp);
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV !== 'production',
    ...sources,
  });
  const { pathname, search } = request.nextUrl;

  // Optimistic cookie check for fast redirects; pages and the API verify the session themselves.
  const hasSession = Boolean(getSessionCookie(request, { cookiePrefix: 'robes' }));
  if (!hasSession && isProtectedPath(pathname)) {
    const url = new URL('/auth/sign-in', request.url);
    url.searchParams.set('next', `${pathname}${search}`);
    return withCsp(NextResponse.redirect(url), csp);
  }
  if (hasSession && isAuthPage(pathname)) {
    return withCsp(NextResponse.redirect(new URL('/', request.url)), csp);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  matcher: [{ source: '/((?!api/|_next/static|_next/image|favicon.ico).*)' }],
};
