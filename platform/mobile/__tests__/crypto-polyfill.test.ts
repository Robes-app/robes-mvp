import { api } from '../src/lib/api';
import { installCrypto } from '../src/lib/crypto-polyfill';
import { mockFetch } from './support/api';

jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000000',
  getRandomValues: <T extends ArrayBufferView>(a: T) => a,
}));

test('a runtime with no global crypto (a release build) gets randomUUID and getRandomValues', () => {
  const runtime: { crypto?: Partial<Crypto> } = {};
  installCrypto(runtime);
  expect(runtime.crypto?.randomUUID?.()).toBe('00000000-0000-4000-8000-000000000000');
  const bytes = new Uint8Array(4);
  expect(runtime.crypto?.getRandomValues?.(bytes)).toBe(bytes);
});

test('a runtime that has crypto keeps its own', () => {
  const own = () =>
    '11111111-1111-4111-8111-111111111111' as `${string}-${string}-${string}-${string}-${string}`;
  const runtime: { crypto?: Partial<Crypto> } = { crypto: { randomUUID: own } };
  installCrypto(runtime);
  expect(runtime.crypto?.randomUUID).toBe(own);
});

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

test('with no global crypto, as on a TestFlight build, an upload still goes out with its idempotency key', async () => {
  const g = globalThis as { crypto?: Crypto };
  const real = g.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  try {
    installCrypto();
    const calls = mockFetch({
      'POST /uploads': {
        assetId: '6f2d3c1e-1b2a-4c3d-8e4f-5a6b7c8d9e0f',
        upload: {
          method: 'PUT',
          url: 'http://minio.test/x',
          headers: {},
          expiresAt: '2026-11-07T11:00:00.000Z',
        },
      },
    });
    await api.call('uploads.create', {
      input: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: 2048 },
    });
    expect(calls[0]?.path).toBe('/api/v1/uploads');
    expect(
      Object.entries(calls[0]?.headers ?? {}).find(
        ([k]) => k.toLowerCase() === 'idempotency-key',
      )?.[1],
    ).toBe('00000000-0000-4000-8000-000000000000');
  } finally {
    Object.defineProperty(globalThis, 'crypto', {
      value: real,
      configurable: true,
      writable: true,
    });
  }
});
