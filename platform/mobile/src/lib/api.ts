import { createApiClient } from '@robes/api-client';
import { authClient } from './auth-client';
import { API_URL, APP_VERSION } from './config';
import { report } from './report';

// A response this build could read only once mended (ADR-022), reported once per route per launch.
const drifted = new Set<string>();

// Better Auth's Expo session cookie from SecureStore, sent explicitly; `omit` stops the native
// cookie jar from adding its own. The app version lets the server answer 426 upgrade_required.
export const api = createApiClient({
  baseUrl: API_URL,
  appVersion: APP_VERSION,
  credentials: 'omit',
  onDrift: (key, error) => {
    if (drifted.has(key)) return;
    drifted.add(key);
    report(error, `drift:${key}`);
  },
  headers: async (): Promise<Record<string, string>> => {
    const cookie = await authClient.getCookie();
    return cookie ? { cookie } : {};
  },
});
