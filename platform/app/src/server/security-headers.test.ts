import { describe, expect, it } from 'vitest';
import { buildCsp } from './security-headers';

describe('buildCsp', () => {
  const csp = buildCsp({ nonce: 'abc', isDev: false, supabaseUrl: 'https://p.supabase.co' });
  it('locks scripts to self + nonce with strict-dynamic', () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
  });
  it('forbids framing, plugins and base hijack', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
  it('allows Supabase https and websocket', () => {
    expect(csp).toContain("connect-src 'self' https://p.supabase.co wss://p.supabase.co");
  });
  it('allows eval only in dev', () => {
    expect(buildCsp({ nonce: 'n', isDev: true, supabaseUrl: 'http://127.0.0.1:54321' })).toContain(
      "'unsafe-eval'",
    );
  });
});
