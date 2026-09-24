import type { NextConfig } from 'next';

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
  transpilePackages: [
    '@robes/api',
    '@robes/auth',
    '@robes/config',
    '@robes/contracts',
    '@robes/copy',
    '@robes/core',
    '@robes/db',
    '@robes/mailer',
    '@robes/tokens',
  ],
  // Native Node deps stay external to the server bundle.
  serverExternalPackages: ['pg', 'nodemailer'],
  async headers() {
    return [{ source: '/:path*', headers: staticSecurityHeaders }];
  },
};

export default config;
