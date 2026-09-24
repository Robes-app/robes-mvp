import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
Object.assign(process.env, {
  APP_ENV: 'dev',
  DATABASE_URL: 'postgres://robes_app:robes_app_local@127.0.0.1:55432/robes_test',
  BETTER_AUTH_SECRET: 'test-secret-at-least-thirty-two-characters-long',
  UNSUB_HMAC_KEY: 'test-unsub-key-at-least-thirty-two-characters',
  BETTER_AUTH_URL: 'http://localhost:3000',
  SMTP_URL: 'smtp://127.0.0.1:51025',
  MEDIA_BUCKET: 'robes-test-media',
  MEDIA_S3_ENDPOINT: 'http://127.0.0.1:59000',
  MEDIA_S3_ACCESS_KEY_ID: 'robes',
  MEDIA_S3_SECRET_ACCESS_KEY: 'robes-local-secret',
});
