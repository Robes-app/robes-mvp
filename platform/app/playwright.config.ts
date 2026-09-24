import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'next start -p 3100',
    port: 3100,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
