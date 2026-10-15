import { defineConfig } from '@playwright/test';
import { E2E_DATABASE_URL, E2E_MEDIA_ENDPOINT, E2E_UNSUB_KEY } from './e2e/env';

// Configurable so parallel checkouts can run e2e side by side.
const port = Number(process.env.E2E_PORT ?? 3310);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL },
  webServer: {
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: baseURL,
      UNSUB_HMAC_KEY: E2E_UNSUB_KEY,
      // Specs assert the offline fake's outputs; never spend on real Gemini from a dev key.
      GEMINI_API_KEY: '',
      MEDIA_S3_ENDPOINT: E2E_MEDIA_ENDPOINT,
      // Dev-only SEC-40 escape hatch so inbox.spec can import from its local fixture page.
      ALLOW_PRIVATE_FETCH: '1',
      // Dummy key: consent.spec intercepts the PostHog host and proves nothing loads before consent.
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_e2e_dummy',
    },
    command: `next start -p ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
