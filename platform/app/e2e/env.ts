// Values the e2e server is started with, shared with specs that must sign things the same way.
export const E2E_UNSUB_KEY = 'e2e-only-unsubscribe-key-0123456789abcdef';

// The database the e2e server uses (ROBES_DB_NAME namespaces parallel worktrees); scripts the
// specs spawn must point at it too, since app/.env.local may name another one.
export const E2E_DATABASE_URL = `postgres://robes_app:robes_app_local@127.0.0.1:55432/${process.env.ROBES_DB_NAME ?? 'robes'}`;

// A LAN media host (for phones) would be upgraded to https by the production CSP, and may not answer
// at all off that network; the server and the CLIs both use the local MinIO.
export const E2E_MEDIA_ENDPOINT = 'http://localhost:59000';

// Worker CLIs spawned by specs load app/.env.local; explicit values keep them on the fake AI and on
// the e2e server's database and bucket (Node's --env-file never overrides a variable already set).
export const CLI_ENV = {
  ...process.env,
  GEMINI_API_KEY: '',
  DATABASE_URL: E2E_DATABASE_URL,
  MEDIA_S3_ENDPOINT: E2E_MEDIA_ENDPOINT,
};
