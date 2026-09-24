import { createApiClient } from '@robes/api-client';
import { authClient } from './auth-client';
import { API_URL, APP_VERSION } from './config';

// Better Auth's Expo session cookie from SecureStore, sent explicitly; `omit` stops the native
// cookie jar from adding its own. The app version lets the server answer 426 upgrade_required.
export const api = createApiClient({
  baseUrl: API_URL,
  appVersion: APP_VERSION,
  credentials: 'omit',
  headers: async (): Promise<Record<string, string>> => {
    const cookie = await authClient.getCookie();
    return cookie ? { cookie } : {};
  },
});
