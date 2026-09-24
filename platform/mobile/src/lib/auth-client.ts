import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

// Session lives in the Keychain/Keystore via SecureStore, never AsyncStorage (CLAUDE.md rule 10).
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    // cookiePrefix must match the server's (packages/auth advanced.cookiePrefix) or the session is dropped.
    expoClient({
      scheme: 'robes',
      storagePrefix: 'robes',
      cookiePrefix: 'robes',
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});
