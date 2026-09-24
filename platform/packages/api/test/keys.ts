import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';

export const ISSUER = 'https://test.supabase.co/auth/v1';

export async function makeKeys() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'ES256' };
  const getKey = createLocalJWKSet({ keys: [jwk] });
  const sign = (
    sub: string,
    opts: {
      issuer?: string;
      audience?: string;
      exp?: string | number;
      extra?: Record<string, unknown>;
    } = {},
  ) =>
    new SignJWT({ role: 'authenticated', ...opts.extra })
      .setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setSubject(sub)
      .setIssuer(opts.issuer ?? ISSUER)
      .setAudience(opts.audience ?? 'authenticated')
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? '5m')
      .sign(privateKey);
  return { getKey, sign };
}
