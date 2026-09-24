import { expo } from '@better-auth/expo';
import type { Mailer } from '@robes/mailer';
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { PostgresDialect } from 'kysely';
import pg from 'pg';
import { otpEmail } from './emails';

export interface AuthConfig {
  databaseUrl: string;
  secret: string;
  baseUrl: string;
  // Exact origins only; no wildcards in production (CLAUDE.md rule 12).
  trustedOrigins: string[];
  mailer: Mailer;
  apple?: { clientId: string; clientSecret: string; appBundleIdentifier?: string } | undefined;
  google?: { clientId: string; clientSecret: string } | undefined;
  production: boolean;
}

const DAY = 60 * 60 * 24;

// Better Auth models mapped onto our snake_case tables in schema `app`.
const TABLES = {
  user: {
    modelName: 'users',
    fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' },
  },
  session: {
    modelName: 'sessions',
    fields: {
      userId: 'user_id',
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  account: {
    modelName: 'accounts',
    fields: {
      userId: 'user_id',
      accountId: 'account_id',
      providerId: 'provider_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  verification: {
    modelName: 'verifications',
    fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
  },
} as const;

export function createAuth(config: AuthConfig) {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: 3,
    application_name: 'robes-auth',
  });
  return betterAuth({
    appName: 'Robes',
    baseURL: config.baseUrl,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: {
      dialect: new PostgresDialect({ pool }),
      type: 'postgres',
      schemaName: 'app',
      transaction: true,
    },
    ...TABLES,
    session: {
      ...TABLES.session,
      expiresIn: 60 * DAY,
      updateAge: DAY,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      ...TABLES.account,
      accountLinking: { enabled: true, trustedProviders: ['apple', 'google'] },
    },
    // Passwordless: no email/password sign-in, so no password storage or reset flow to attack.
    emailAndPassword: { enabled: false },
    socialProviders: {
      ...(config.apple ? { apple: config.apple } : {}),
      ...(config.google ? { google: config.google } : {}),
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rate_limits',
      fields: { lastRequest: 'last_request' },
      window: 60,
      max: 60,
      customRules: {
        '/email-otp/send-verification-otp': { window: 60, max: 3 },
        '/sign-in/email-otp': { window: 60, max: 10 },
      },
    },
    advanced: {
      cookiePrefix: 'robes',
      useSecureCookies: config.production,
      database: { generateId: 'uuid' },
      ipAddress: { ipAddressHeaders: ['x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip'] },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        async sendVerificationOTP({ email, otp, type }) {
          await config.mailer.send(otpEmail(email, otp, type));
        },
      }),
      expo(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

// Resolves the signed-in user for a request (cookie on web, Expo header on native).
export async function sessionUser(auth: Auth, headers: Headers): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}
