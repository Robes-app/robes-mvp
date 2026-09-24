import { z } from 'zod';

const DEV_ONLY_FLAGS = ['ALLOW_PRIVATE_FETCH', 'NOTIFY_DEBUG', 'JOBS_TRANSPORT_INLINE'] as const;

const optionalSecret = z.string().min(1).optional();

export const appServerEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    APP_ENV: z.enum(['dev', 'staging', 'production']),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    // Comma-separated extra trusted origins, e.g. the Expo scheme in dev.
    AUTH_TRUSTED_ORIGINS: z.string().optional(),
    APPLE_CLIENT_ID: optionalSecret,
    APPLE_CLIENT_SECRET: optionalSecret,
    APPLE_APP_BUNDLE_ID: optionalSecret,
    GOOGLE_CLIENT_ID: optionalSecret,
    GOOGLE_CLIENT_SECRET: optionalSecret,
    MAIL_FROM: z.string().min(3).default('Robes <hello@byrobes.com>'),
    SMTP_URL: z.url().optional(),
    RESEND_API_KEY: optionalSecret,
    MIN_APP_VERSION: z
      .string()
      .regex(/^\d+(\.\d+)*$/)
      .optional(),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: optionalSecret,
    ALLOW_PRIVATE_FETCH: z.string().optional(),
    NOTIFY_DEBUG: z.string().optional(),
    JOBS_TRANSPORT_INLINE: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const deployed = env.APP_ENV !== 'dev';
    if (deployed && !(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)) {
      ctx.addIssue({
        code: 'custom',
        path: ['UPSTASH_REDIS_REST_URL'],
        message: 'required outside dev',
      });
    }
    if (deployed && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'required outside dev' });
    }
    if (!deployed && !env.SMTP_URL && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'set SMTP_URL (Mailpit) in dev',
      });
    }
    if (Boolean(env.APPLE_CLIENT_ID) !== Boolean(env.APPLE_CLIENT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['APPLE_CLIENT_SECRET'],
        message: 'Apple needs id and secret',
      });
    }
    if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_SECRET'],
        message: 'Google needs id and secret',
      });
    }
    if (env.APP_ENV === 'production') {
      if (!env.BETTER_AUTH_URL.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: ['BETTER_AUTH_URL'],
          message: 'must be https in production',
        });
      }
      for (const flag of DEV_ONLY_FLAGS) {
        if (env[flag] !== undefined) {
          ctx.addIssue({ code: 'custom', path: [flag], message: 'not allowed in production' });
        }
      }
    }
  })
  .transform((env) => ({
    ...env,
    authTrustedOrigins: [
      new URL(env.BETTER_AUTH_URL).origin,
      ...(env.AUTH_TRUSTED_ORIGINS?.split(',')
        .map((o) => o.trim())
        .filter(Boolean) ?? []),
    ],
  }));

export type AppServerEnv = z.infer<typeof appServerEnv>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')} (${i.message})`);
    throw new Error(`Invalid environment: ${problems.join(', ')}`);
  }
  return result.data;
}
