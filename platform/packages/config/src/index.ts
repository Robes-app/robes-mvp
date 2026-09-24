import { z } from 'zod';

const DEV_ONLY_FLAGS = ['ALLOW_PRIVATE_FETCH', 'NOTIFY_DEBUG', 'JOBS_TRANSPORT_INLINE'] as const;

const optionalSecret = z.string().min(1).optional();

type Issues = z.RefinementCtx;

const mediaEnv = z.object({
  MEDIA_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  MEDIA_S3_REGION: z.string().min(1).default('eu-west-1'),
  // MinIO locally; unset in AWS (the SDK picks the regional endpoint).
  MEDIA_S3_ENDPOINT: z.url().optional(),
  // Local MinIO only: deployed envs use the Vercel OIDC role, never long-lived keys (SEC-73).
  MEDIA_S3_ACCESS_KEY_ID: optionalSecret,
  MEDIA_S3_SECRET_ACCESS_KEY: optionalSecret,
  // Origin images are served from (CloudFront, e.g. https://media.byrobes.com); CSP img-src.
  MEDIA_PUBLIC_ORIGIN: z.url().optional(),
  MEDIA_CLOUDFRONT_KEY_PAIR_ID: optionalSecret,
  // PEM; `\n` escapes are accepted for single-line env stores.
  MEDIA_CLOUDFRONT_PRIVATE_KEY: optionalSecret,
  // Parent domain shared by app and media host (e.g. byrobes.com) so web signed cookies reach it.
  MEDIA_COOKIE_DOMAIN: z.string().min(3).optional(),
});

type MediaFields = z.infer<typeof mediaEnv>;

function checkMedia(env: MediaFields & { APP_ENV: string }, ctx: Issues): void {
  const issue = (path: keyof MediaFields, message: string): void =>
    ctx.addIssue({ code: 'custom', path: [path], message });
  const signing = [env.MEDIA_CLOUDFRONT_KEY_PAIR_ID, env.MEDIA_CLOUDFRONT_PRIVATE_KEY];
  if (signing.some(Boolean) && !signing.every(Boolean)) {
    issue('MEDIA_CLOUDFRONT_PRIVATE_KEY', 'CloudFront signing needs key pair id and private key');
  }
  if (signing.some(Boolean) && !env.MEDIA_PUBLIC_ORIGIN) {
    issue('MEDIA_PUBLIC_ORIGIN', 'required with CloudFront signing');
  }
  if (Boolean(env.MEDIA_S3_ACCESS_KEY_ID) !== Boolean(env.MEDIA_S3_SECRET_ACCESS_KEY)) {
    issue('MEDIA_S3_SECRET_ACCESS_KEY', 'S3 credentials need id and secret');
  }
  if (env.APP_ENV === 'dev') {
    if (!env.MEDIA_S3_ENDPOINT) issue('MEDIA_S3_ENDPOINT', 'set the MinIO endpoint in dev');
    return;
  }
  if (!signing.every(Boolean)) {
    issue('MEDIA_CLOUDFRONT_KEY_PAIR_ID', 'CloudFront signing is required outside dev');
  }
  if (env.MEDIA_PUBLIC_ORIGIN && !env.MEDIA_PUBLIC_ORIGIN.startsWith('https://')) {
    issue('MEDIA_PUBLIC_ORIGIN', 'must be https outside dev');
  }
  if (env.MEDIA_S3_ACCESS_KEY_ID) issue('MEDIA_S3_ACCESS_KEY_ID', 'not allowed outside dev');
}

function mediaConfig(env: MediaFields) {
  const endpointOrigin = env.MEDIA_S3_ENDPOINT && new URL(env.MEDIA_S3_ENDPOINT).origin;
  const cloudfront =
    env.MEDIA_PUBLIC_ORIGIN && env.MEDIA_CLOUDFRONT_KEY_PAIR_ID && env.MEDIA_CLOUDFRONT_PRIVATE_KEY
      ? {
          origin: new URL(env.MEDIA_PUBLIC_ORIGIN).origin,
          keyPairId: env.MEDIA_CLOUDFRONT_KEY_PAIR_ID,
          privateKey: env.MEDIA_CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n'),
          cookieDomain: env.MEDIA_COOKIE_DOMAIN,
        }
      : undefined;
  return {
    s3: {
      bucket: env.MEDIA_BUCKET,
      region: env.MEDIA_S3_REGION,
      endpoint: env.MEDIA_S3_ENDPOINT,
      credentials:
        env.MEDIA_S3_ACCESS_KEY_ID && env.MEDIA_S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID,
              secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    },
    cloudfront,
    // CSP: where images load from, and where the browser PUTs uploads.
    deliveryOrigin: cloudfront?.origin ?? endpointOrigin ?? '',
    uploadOrigin:
      endpointOrigin ?? `https://${env.MEDIA_BUCKET}.s3.${env.MEDIA_S3_REGION}.amazonaws.com`,
  };
}

export type MediaConfig = ReturnType<typeof mediaConfig>;

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
    // Local mail catcher; deployed environments send through SES (ADR-021).
    SMTP_URL: z.url().optional(),
    SES_CONFIGURATION_SET: optionalSecret,
    AWS_REGION: z
      .string()
      .regex(/^[a-z]{2}-[a-z]+-\d$/)
      .optional(),
    AWS_ACCESS_KEY_ID: optionalSecret,
    AWS_SECRET_ACCESS_KEY: optionalSecret,
    MIN_APP_VERSION: z
      .string()
      .regex(/^\d+(\.\d+)*$/)
      .optional(),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: optionalSecret,
    ALLOW_PRIVATE_FETCH: z.string().optional(),
    NOTIFY_DEBUG: z.string().optional(),
    JOBS_TRANSPORT_INLINE: z.string().optional(),
    // SQS jobs-interactive queue; without it jobs run in-process after the response (dev only).
    JOBS_INTERACTIVE_QUEUE_URL: z.url().optional(),
    ...mediaEnv.shape,
  })
  .superRefine((env, ctx) => {
    checkMedia(env, ctx);
    const deployed = env.APP_ENV !== 'dev';
    if (deployed && !env.JOBS_INTERACTIVE_QUEUE_URL && env.JOBS_TRANSPORT_INLINE === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['JOBS_INTERACTIVE_QUEUE_URL'],
        message: 'required outside dev',
      });
    }
    if (deployed && !(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)) {
      ctx.addIssue({
        code: 'custom',
        path: ['UPSTASH_REDIS_REST_URL'],
        message: 'required outside dev',
      });
    }
    if (deployed) {
      for (const key of ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] as const) {
        if (!env[key])
          ctx.addIssue({ code: 'custom', path: [key], message: 'required outside dev' });
      }
      if (env.SMTP_URL) {
        ctx.addIssue({
          code: 'custom',
          path: ['SMTP_URL'],
          message: 'deployed environments send via SES',
        });
      }
    } else if (!env.SMTP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'set SMTP_URL (local mail catcher) in dev',
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
    mail:
      env.APP_ENV === 'dev'
        ? { transport: 'smtp' as const, url: env.SMTP_URL ?? '', from: env.MAIL_FROM }
        : {
            transport: 'ses' as const,
            region: env.AWS_REGION ?? '',
            from: env.MAIL_FROM,
            configurationSet: env.SES_CONFIGURATION_SET,
          },
    authTrustedOrigins: [
      new URL(env.BETTER_AUTH_URL).origin,
      ...(env.AUTH_TRUSTED_ORIGINS?.split(',')
        .map((o) => o.trim())
        .filter(Boolean) ?? []),
    ],
    media: mediaConfig(env),
  }));

export type AppServerEnv = z.infer<typeof appServerEnv>;

// Lambda workers: infra passes the DB URL as a Secrets Manager ARN; local runs pass it directly.
export const workerEnv = z
  .object({
    APP_ENV: z.enum(['dev', 'staging', 'production']),
    DATABASE_URL: z.url().optional(),
    DATABASE_URL_SECRET_ARN: z.string().startsWith('arn:').optional(),
    JOBS_INTERACTIVE_QUEUE_URL: z.url().optional(),
  })
  .superRefine((env, ctx) => {
    if (!env.DATABASE_URL === !env.DATABASE_URL_SECRET_ARN) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'set exactly one of DATABASE_URL or DATABASE_URL_SECRET_ARN',
      });
    }
    if (env.APP_ENV === 'production' && env.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'use DATABASE_URL_SECRET_ARN in production',
      });
    }
  });

export type WorkerEnv = z.infer<typeof workerEnv>;

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
