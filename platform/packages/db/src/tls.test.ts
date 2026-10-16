import { describe, expect, it } from 'vitest';
import { SUPABASE_ROOT_CA, tlsFor } from './tls';

describe('tlsFor', () => {
  it('verifies Supabase hosts against the Supabase root and drops sslmode', () => {
    const out = tlsFor(
      'postgresql://u:p@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require',
    );
    expect(out.connectionString).not.toContain('sslmode');
    expect(out.ssl).toEqual({ ca: SUPABASE_ROOT_CA, rejectUnauthorized: true });
    expect(
      tlsFor('postgresql://u:p@db.abc.supabase.co:5432/postgres').ssl?.rejectUnauthorized,
    ).toBe(true);
  });

  it('leaves other hosts alone (local docker, other providers)', () => {
    const local = 'postgres://robes_app:x@127.0.0.1:55432/robes';
    expect(tlsFor(local)).toEqual({ connectionString: local });
    expect(tlsFor('postgresql://u:p@evil-supabase.com.attacker.io/db').ssl).toBeUndefined();
  });
});
