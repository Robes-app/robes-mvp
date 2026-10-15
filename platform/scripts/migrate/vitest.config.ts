import { defineConfig } from 'vitest/config';

// One suite builds databases on the local server; keep it serial and give it time.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
