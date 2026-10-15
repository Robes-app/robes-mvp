import http from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isBlockedAddress } from './address';
import { checkUrl, FetchRefused, safeFetch } from './safe-fetch';

// SEC-40 table: every row must be refused. Resolvers are stubbed; nothing leaves the machine.
const resolveTo =
  (...ips: string[]): LookupFunction =>
  (_host, _opts, cb) =>
    (cb as (e: null, a: { address: string; family: number }[]) => void)(
      null,
      ips.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })),
    );

const refused = async (p: Promise<unknown>, reason?: string) => {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(FetchRefused);
  if (reason) expect((err as FetchRefused).reason).toBe(reason);
};

describe('SEC-40 address policy', () => {
  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    '::127.0.0.1',
    '64:ff9b::a9fe:a9fe',
    '2002:7f00:1::',
    '2001:db8::1',
    'not-an-ip',
  ])('blocks %s', (ip) => expect(isBlockedAddress(ip)).toBe(true));

  it.each(['93.184.216.34', '8.8.8.8', '2606:2800:220:1::1', '172.32.0.1'])(
    'allows public %s',
    (ip) => expect(isBlockedAddress(ip)).toBe(false),
  );
});

describe('SEC-40 URL table', () => {
  it.each([
    ['http://shop.example/coat', 'scheme'],
    ['ftp://shop.example/coat', 'scheme'],
    ['file:///etc/passwd', 'scheme'],
    ['javascript:alert(1)', 'scheme'],
    ['https://user:pw@shop.example/', 'credentials'],
    ['https://shop.example:8443/', 'port'],
    ['https://localhost/', 'private_host'],
    ['https://metadata.google.internal/', 'private_host'],
    ['https://127.0.0.1/', 'private_address'],
    ['https://169.254.169.254/latest/meta-data/', 'private_address'],
    // Decimal, hex and octal forms normalise to 127.0.0.1 in the WHATWG parser.
    ['https://2130706433/', 'private_address'],
    ['https://0x7f000001/', 'private_address'],
    ['https://0177.0.0.1/', 'private_address'],
    ['https://0x7f.1/', 'private_address'],
    ['https://[::1]/', 'private_address'],
    ['https://[fe80::1]/', 'private_address'],
    ['https://[::ffff:169.254.169.254]/', 'private_address'],
    ['not a url', 'invalid_url'],
  ])('refuses %s', (url, reason) => {
    expect(() => checkUrl(url)).toThrow(FetchRefused);
    try {
      checkUrl(url);
    } catch (err) {
      expect((err as FetchRefused).reason).toBe(reason);
    }
  });

  it('refuses a hostname that resolves to a private address (incl. one of many)', async () => {
    await refused(
      safeFetch('https://shop.example/', { resolve: resolveTo('10.0.0.5') }),
      'private_address',
    );
    await refused(
      safeFetch('https://shop.example/', {
        resolve: resolveTo('93.184.216.34', '169.254.169.254'),
      }),
      'private_address',
    );
    await refused(
      safeFetch('https://shop.example/', { resolve: resolveTo('::1') }),
      'private_address',
    );
  });

  it('re-validates every redirect and caps the chain', async () => {
    const redirectTo = (location: string) => async () => ({
      status: 302,
      location,
      contentType: 'text/html',
      body: '',
    });
    await refused(
      safeFetch('https://shop.example/', { transport: redirectTo('http://169.254.169.254/') }),
      'scheme',
    );
    await refused(
      safeFetch('https://shop.example/', {
        transport: redirectTo('https://169.254.169.254/latest'),
      }),
      'private_address',
    );
    await refused(
      safeFetch('https://shop.example/', { transport: redirectTo('https://[::1]/') }),
      'private_address',
    );
    await refused(
      safeFetch('https://shop.example/', { transport: redirectTo('https://shop.example/again') }),
      'too_many_redirects',
    );
  });
});

describe('SEC-40 response limits (local fixture server, allowPrivate)', () => {
  let server: http.Server;
  let base: string;
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/big') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('x'.repeat(5_000));
      } else if (req.url === '/json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{}');
      } else if (req.url === '/slow') {
        res.writeHead(200, { 'content-type': 'text/html' });
        // Never ends: the timeout must fire.
      } else {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<title>ok</title>');
      }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  it('refuses oversized bodies, non-HTML types and slow servers', async () => {
    await refused(safeFetch(`${base}/big`, { allowPrivate: true, maxBytes: 1_000 }), 'too_large');
    await refused(safeFetch(`${base}/json`, { allowPrivate: true }), 'content_type');
    await refused(safeFetch(`${base}/slow`, { allowPrivate: true, timeoutMs: 200 }), 'timeout');
    expect((await safeFetch(`${base}/`, { allowPrivate: true })).body).toContain('ok');
  });

  it('refuses the same local server without the dev escape hatch', async () => {
    await refused(safeFetch(`${base}/`), 'scheme');
  });
});
