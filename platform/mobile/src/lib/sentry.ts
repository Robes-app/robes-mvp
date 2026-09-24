import * as Sentry from '@sentry/react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { APP_ENV, APP_VERSION, SENTRY_DSN } from './config';
import { sentryOptions } from './sentry-options';

// No DSN (local dev by default) → Sentry stays off entirely.
export function initSentry(): void {
  if (!SENTRY_DSN) return;
  Sentry.init(
    sentryOptions({
      dsn: SENTRY_DSN,
      environment: APP_ENV,
      release: APP_VERSION,
      expoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
    }),
  );
}
