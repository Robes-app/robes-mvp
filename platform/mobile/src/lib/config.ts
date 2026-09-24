import Constants from 'expo-constants';

// EXPO_PUBLIC_* values are inlined at build time; they are public config, never secrets.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3300';
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

// Publishable keys, not secrets. Unset → analytics and error reporting stay off.
const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
export const POSTHOG = posthogKey
  ? { key: posthogKey, host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com' }
  : null;
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? null;
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'dev';
