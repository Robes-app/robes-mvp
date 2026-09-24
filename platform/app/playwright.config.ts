import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    env: {
      DATABASE_URL: 'postgres://robes_app:robes_app_local@127.0.0.1:55432/robes',
      BETTER_AUTH_URL: 'http://localhost:3100',
    },
    command: 'next start -p 3100',
    port: 3100,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
