import { defineConfig } from 'vitest/config';

// sharp's AVIF encodes are CPU-bound; 2-vCPU CI runners need well over vitest's 5s default.
export default defineConfig({ test: { include: ['src/**/*.test.ts'], testTimeout: 30_000 } });
