import { randomUUID } from 'node:crypto';
import { createMemoryMailer } from '@robes/mailer';
import pg from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAuth, sessionUser } from '../src/index';

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://robes_app:robes_app_local@127.0.0.1:55432/robes_test';
const BASE = 'http://localhost:3000';

const mailer = createMemoryMailer();
const auth = createAuth({
  databaseUrl: DATABASE_URL,
  secret: 'test-secret-at-least-thirty-two-characters-long',
  baseUrl: BASE,
  trustedOrigins: [BASE],
  mailer,
  production: false,
});
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const emails: string[] = [];

afterAll(async () => {
  await pool.query('delete from app.users where email = any($1)', [emails]);
  await pool.end();
});

// Rate limits persist in Postgres, so each test gets its own client IP.
let ip = '';
beforeEach(() => {
  const octet = (): number => Math.floor(Math.random() * 250);
  ip = `10.${octet()}.${octet()}.${octet()}`;
});

function post(path: string, body: unknown): Promise<Response> {
  return auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  );
}

async function requestCode(email: string): Promise<string> {
  const res = await post('/email-otp/send-verification-otp', { email, type: 'sign-in' });
  expect(res.status).toBe(200);
  const mail = mailer.sent.findLast((m) => m.to === email);
  const code = mail?.subject.slice(0, 6);
  expect(code).toMatch(/^\d{6}$/);
  return code as string;
}

describe('email OTP sign-in', () => {
  it('signs a new user in with a code and creates their profile', async () => {
    const email = `otp-${randomUUID()}@test.dev`;
    emails.push(email);
    const code = await requestCode(email);

    const res = await post('/sign-in/email-otp', { email, otp: code });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('robes.session_token=');
    expect(cookie.toLowerCase()).toContain('httponly');

    const user = await sessionUser(auth, new Headers({ cookie: cookie.split(';')[0] ?? '' }));
    expect(user?.email).toBe(email);
    const profile = await pool.query('select id from app.profiles where id = $1', [user?.id]);
    expect(profile.rowCount).toBe(1);
  });

  it('rejects wrong codes and burns the code after 3 attempts', async () => {
    const email = `otp-${randomUUID()}@test.dev`;
    emails.push(email);
    const code = await requestCode(email);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 3; i++) {
      expect((await post('/sign-in/email-otp', { email, otp: wrong })).status).not.toBe(200);
    }
    expect((await post('/sign-in/email-otp', { email, otp: code })).status).not.toBe(200);
  });

  it('stores OTPs hashed, never in plain text', async () => {
    const email = `otp-${randomUUID()}@test.dev`;
    emails.push(email);
    const code = await requestCode(email);
    const rows = await pool.query('select value from app.verifications where identifier like $1', [
      `%${email}%`,
    ]);
    expect(rows.rowCount).toBeGreaterThan(0);
    for (const row of rows.rows) expect(String(row.value)).not.toContain(code);
  });

  it('rate limits code requests per IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const email = `otp-${randomUUID()}@test.dev`;
      emails.push(email);
      statuses.push(
        (await post('/email-otp/send-verification-otp', { email, type: 'sign-in' })).status,
      );
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('returns no session without a cookie', async () => {
    expect(await sessionUser(auth, new Headers())).toBeNull();
  });
});
