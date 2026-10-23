import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { legacyRedirects } from './src/lib/legacy-redirects';

const staticSecurityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Browser Sentry settings are inlined at build time; the DSN itself is NEXT_PUBLIC_SENTRY_DSN.
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT ?? process.env.APP_ENV ?? 'dev',
    NEXT_PUBLIC_SENTRY_RELEASE:
      process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1',
  },
  transpilePackages: [
    '@robes/analytics',
    '@robes/api',
    '@robes/api-client',
    '@robes/auth',
    '@robes/config',
    '@robes/contracts',
    '@robes/copy',
    '@robes/core',
    '@robes/db',
    '@robes/icons',
    '@robes/jobs',
    '@robes/logger',
    '@robes/mailer',
    '@robes/media',
    '@robes/tokens',
    '@robes/ui',
  ],
  // Native Node deps stay external to the server bundle.
  serverExternalPackages: [
    'pg',
    'nodemailer',
    'sharp',
    '@aws-sdk/client-sesv2',
    '@aws-sdk/client-sqs',
  ],
  async redirects() {
    return legacyRedirects;
  },
  async headers() {
    return [{ source: '/:path*', headers: staticSecurityHeaders }];
  },
};

// Source maps upload only in CI with SENTRY_AUTH_TOKEN; without it the build is unchanged.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default sentryAuthToken
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: sentryAuthToken,
      release: { name: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA },
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      telemetry: false,
      silent: !process.env.CI,
    })
  : config;
