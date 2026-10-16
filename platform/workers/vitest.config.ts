import { defineConfig } from 'vitest/config';

// The rendition handler runs sharp's AVIF pipeline; 2-vCPU CI runners need well over 5s.
export default defineConfig({ test: { testTimeout: 30_000 } });
