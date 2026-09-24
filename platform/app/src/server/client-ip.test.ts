import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

const req = (headers: Record<string, string>) => new Request('http://x', { headers });

describe('clientIp', () => {
  it('prefers the Vercel header, then x-forwarded-for, then x-real-ip', () => {
    expect(clientIp(req({ 'x-vercel-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe('1.1.1.1');
    expect(clientIp(req({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }))).toBe('3.3.3.3');
    expect(clientIp(req({ 'x-real-ip': '5.5.5.5' }))).toBe('5.5.5.5');
  });
  it('falls back to unknown', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});
