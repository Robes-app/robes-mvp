// Values the e2e server is started with, shared with specs that must sign things the same way.
export const E2E_UNSUB_KEY = 'e2e-only-unsubscribe-key-0123456789abcdef';

// Worker CLIs spawned by specs load app/.env.local; explicit values keep them on the fake AI, the
// e2e server's database and local MinIO (Node's --env-file never overrides a variable already set).
export const CLI_ENV = {
  ...process.env,
  GEMINI_API_KEY: '',
  DATABASE_URL: `postgres://robes_app:robes_app_local@127.0.0.1:55432/${process.env.ROBES_DB_NAME ?? 'robes'}`,
  MEDIA_S3_ENDPOINT: 'http://localhost:59000',
};
