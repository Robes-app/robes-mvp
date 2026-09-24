import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
Object.assign(process.env, {
  APP_ENV: 'dev',
  DATABASE_URL: 'postgres://robes_app:robes_app_local@127.0.0.1:55432/robes_test',
  BETTER_AUTH_SECRET: 'test-secret-at-least-thirty-two-characters-long',
  BETTER_AUTH_URL: 'http://localhost:3000',
  SMTP_URL: 'smtp://127.0.0.1:51025',
});
