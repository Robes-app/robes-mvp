import { defineConfig } from 'vitest/config';

// Files share one database and some global queues (deletion requests, the spend breaker), so
// they run one at a time; the whole suite still takes about a second.
export default defineConfig({ test: { fileParallelism: false } });
