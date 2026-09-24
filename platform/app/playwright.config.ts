import { defineConfig } from '@playwright/test';

// Configurable so parallel checkouts can run e2e side by side.
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL },
  webServer: {
    env: {
      DATABASE_URL: 'postgres://robes_app:robes_app_local@127.0.0.1:55432/robes',
      BETTER_AUTH_URL: baseURL,
      // Dummy key: consent.spec intercepts the PostHog host and proves nothing loads before consent.
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_e2e_dummy',
    },
    command: `next start -p ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
