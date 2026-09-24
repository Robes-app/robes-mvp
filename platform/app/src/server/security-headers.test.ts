import { describe, expect, it } from 'vitest';
import { buildCsp } from './security-headers';

describe('buildCsp', () => {
  const csp = buildCsp({ nonce: 'abc', isDev: false });
  it('locks scripts to self + nonce with strict-dynamic', () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
  });
  it('forbids framing, plugins and base hijack', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
  it('only connects to self unless origins are added', () => {
    expect(csp).toContain("connect-src 'self';");
    expect(
      buildCsp({ nonce: 'n', isDev: false, connectOrigins: ['https://media.byrobes.com'] }),
    ).toContain("connect-src 'self' https://media.byrobes.com");
  });
  it('allows eval only in dev', () => {
    expect(buildCsp({ nonce: 'n', isDev: true })).toContain("'unsafe-eval'");
  });
  it('adds media origins to img-src and upload origins to connect-src', () => {
    const media = buildCsp({
      nonce: 'n',
      isDev: false,
      imgOrigins: ['https://media.byrobes.com'],
      connectOrigins: [
        'https://media.byrobes.com',
        'https://robes-prod-media.s3.eu-west-1.amazonaws.com',
      ],
    });
    expect(media).toContain("img-src 'self' data: blob: https://media.byrobes.com;");
    expect(media).toContain(
      "connect-src 'self' https://media.byrobes.com https://robes-prod-media.s3.eu-west-1.amazonaws.com;",
    );
    expect(csp).toContain("img-src 'self' data: blob:;");
  });
  it('lists an origin once even if passed twice', () => {
    const local = buildCsp({
      nonce: 'n',
      isDev: true,
      connectOrigins: ['http://127.0.0.1:59000', 'http://127.0.0.1:59000'],
    });
    expect(local).toContain("connect-src 'self' http://127.0.0.1:59000;");
  });
});
