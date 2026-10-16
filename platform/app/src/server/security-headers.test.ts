import { describe, expect, it } from 'vitest';
import { buildCsp, cspSources } from './security-headers';

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

describe('cspSources', () => {
  const media = {
    deliveryOrigin: 'https://media.byrobes.com',
    uploadOrigin: 'https://robes-prod-media.s3.eu-west-1.amazonaws.com',
  };

  it('frames only itself, plus Cloudflare when Turnstile is on', () => {
    const off = buildCsp({
      nonce: 'n',
      isDev: false,
      ...cspSources(media, { connectOrigins: [] }),
    });
    expect(off).toContain("frame-src 'self';");
    const on = buildCsp({
      nonce: 'n',
      isDev: false,
      ...cspSources(media, { connectOrigins: [] }, true),
    });
    expect(on).toContain("frame-src 'self' https://challenges.cloudflare.com;");
  });

  it('adds nothing for Sentry or PostHog when they are not configured', () => {
    const csp = buildCsp({
      nonce: 'n',
      isDev: false,
      ...cspSources(media, { connectOrigins: [] }),
    });
    expect(csp).not.toMatch(/sentry|posthog/);
  });

  it('lets the browser reach the configured Sentry ingest and PostHog EU hosts', () => {
    const sources = cspSources(media, {
      connectOrigins: ['https://o1.ingest.de.sentry.io', 'https://eu.i.posthog.com'],
    });
    const csp = buildCsp({ nonce: 'n', isDev: false, ...sources });
    expect(csp).toContain(
      "connect-src 'self' https://media.byrobes.com https://robes-prod-media.s3.eu-west-1.amazonaws.com https://o1.ingest.de.sentry.io https://eu.i.posthog.com;",
    );
    expect(csp).toContain("img-src 'self' data: blob: https://media.byrobes.com;");
    expect(csp).toContain("script-src 'self' 'nonce-n' 'strict-dynamic';");
  });
});
