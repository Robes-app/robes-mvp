import { withPostHogConfig } from '@posthog/nextjs-config';
import type { NextConfig } from 'next';
import { legacyRedirects } from './src/lib/legacy-redirects';

const staticSecurityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Geolocation for our own origin only: the weather, once she allows it (shell/device-location.tsx).
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  // Only production is indexed; staging and previews (APP_ENV unset) tell crawlers to stay out.
  ...(process.env.APP_ENV === 'production'
    ? []
    : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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

// Source maps go to PostHog error tracking only when the build has a personal API key.
const posthogApiKey = process.env.POSTHOG_PERSONAL_API_KEY;

export default posthogApiKey
  ? withPostHogConfig(config, {
      personalApiKey: posthogApiKey,
      projectId: process.env.POSTHOG_PROJECT_ID,
      host: 'https://eu.posthog.com',
      sourcemaps: {
        releaseName: 'robes-web',
        releaseVersion: process.env.VERCEL_GIT_COMMIT_SHA,
        deleteAfterUpload: true,
      },
    })
  : config;
