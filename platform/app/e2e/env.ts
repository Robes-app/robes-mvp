// Values the e2e server is started with, shared with specs that must sign things the same way.
export const E2E_UNSUB_KEY = 'e2e-only-unsubscribe-key-0123456789abcdef';

// Worker CLIs spawned by specs load app/.env.local; an explicit empty key keeps them on the fake AI
// (Node's --env-file never overrides a variable already set).
export const CLI_ENV = { ...process.env, GEMINI_API_KEY: '' };
