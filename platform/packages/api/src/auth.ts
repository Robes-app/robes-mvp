import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';

export interface AuthUser {
  id: string;
  role: string;
  email?: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<AuthUser | null>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createJwtVerifier(opts: {
  getKey: JWTVerifyGetKey;
  issuer: string;
  audience?: string;
}): TokenVerifier {
  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, opts.getKey, {
          issuer: opts.issuer,
          audience: opts.audience ?? 'authenticated',
          algorithms: ['ES256', 'RS256'],
          requiredClaims: ['exp', 'sub'],
        });
        if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) return null;
        // Anonymous sign-ins are real sessions; they must never pass a 'user' route.
        if (payload.is_anonymous === true) return null;
        return {
          id: payload.sub,
          role: typeof payload.role === 'string' ? payload.role : 'authenticated',
          ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
        };
      } catch {
        return null;
      }
    },
  };
}

export function remoteJwks(url: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(url));
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
