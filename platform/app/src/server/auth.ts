import 'server-only';
import { createAuth } from '@robes/auth';
import { env } from './env';
import { mailer } from './mailer';

export const auth = createAuth({
  databaseUrl: env.DATABASE_URL,
  secret: env.BETTER_AUTH_SECRET,
  baseUrl: env.BETTER_AUTH_URL,
  trustedOrigins: env.authTrustedOrigins,
  mailer,
  production: env.APP_ENV !== 'dev',
  apple:
    env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
      ? {
          clientId: env.APPLE_CLIENT_ID,
          clientSecret: env.APPLE_CLIENT_SECRET,
          ...(env.APPLE_APP_BUNDLE_ID ? { appBundleIdentifier: env.APPLE_APP_BUNDLE_ID } : {}),
        }
      : undefined,
  google:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
      : undefined,
});

export const socialProviders = {
  apple: Boolean(env.APPLE_CLIENT_ID),
  google: Boolean(env.GOOGLE_CLIENT_ID),
};
