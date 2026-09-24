import { describe, expect, it } from 'vitest';
import { ISSUER, makeKeys } from '../test/keys';
import { createJwtVerifier } from './auth';

const USER = '11111111-1111-4111-8111-111111111111';

describe('createJwtVerifier', async () => {
  const { getKey, sign } = await makeKeys();
  const verifier = createJwtVerifier({ getKey, issuer: ISSUER });

  it('accepts a valid token and returns the subject', async () => {
    expect(await verifier.verify(await sign(USER, { extra: { email: 'a@b.co' } }))).toEqual({
      id: USER,
      role: 'authenticated',
      email: 'a@b.co',
    });
  });
  it('rejects wrong issuer', async () => {
    expect(await verifier.verify(await sign(USER, { issuer: 'https://evil/auth/v1' }))).toBeNull();
  });
  it('rejects wrong audience', async () => {
    expect(await verifier.verify(await sign(USER, { audience: 'anon' }))).toBeNull();
  });
  it('rejects expired tokens', async () => {
    expect(
      await verifier.verify(await sign(USER, { exp: Math.floor(Date.now() / 1000) - 60 })),
    ).toBeNull();
  });
  it('rejects garbage and unsigned tokens', async () => {
    expect(await verifier.verify('not.a.jwt')).toBeNull();
    const unsigned = `${btoa('{"alg":"none"}')}.${btoa(`{"sub":"${USER}"}`)}.`;
    expect(await verifier.verify(unsigned)).toBeNull();
  });
  it('rejects a non-uuid subject', async () => {
    expect(await verifier.verify(await sign('admin'))).toBeNull();
  });
});
