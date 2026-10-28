import { APP_LINK_PREFIXES } from '@robes/core/app-links';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// One codebase, three installable apps (set APP_VARIANT per EAS profile, eas.json):
// production keeps com.byrobes.app for the store; staging and development sit beside it.
// linkHost: the web host whose links open this build (its /.well-known files name this bundle id);
// development has none, so a dev build never claims a deployed host's links.
const VARIANTS = {
  production: {
    name: 'Robes',
    id: 'com.byrobes.app',
    scheme: 'robes',
    linkHost: 'app.byrobes.com',
  },
  staging: {
    name: 'Robes Staging',
    id: 'com.byrobes.app.staging',
    scheme: 'robes-staging',
    linkHost: 'staging.byrobes.com',
  },
  development: {
    name: 'Robes Dev',
    id: 'com.byrobes.app.dev',
    scheme: 'robes-dev',
    linkHost: null,
  },
} as const;

type Variant = keyof typeof VARIANTS;

function variant(): Variant {
  const v = process.env.APP_VARIANT ?? 'development';
  if (!(v in VARIANTS))
    throw new Error(`APP_VARIANT must be one of ${Object.keys(VARIANTS).join(', ')}`);
  return v as Variant;
}

// Universal links (N4). Web twin: app/src/server/app-links.ts. Each prefix exactly and everything
// under it, so /look never claims /lookbook.
function appLinks(host: string | null) {
  if (!host) return { ios: {}, android: {} };
  return {
    ios: { associatedDomains: [`applinks:${host}`] },
    android: {
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          category: ['BROWSABLE', 'DEFAULT'],
          data: APP_LINK_PREFIXES.flatMap((p) => [
            { scheme: 'https', host, path: p },
            { scheme: 'https', host, pathPrefix: `${p}/` },
          ]),
        },
      ],
    },
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const v = VARIANTS[variant()];
  const links = appLinks(v.linkHost);
  return {
    ...config,
    name: v.name,
    slug: config.slug ?? 'robes',
    scheme: v.scheme,
    ios: { ...config.ios, bundleIdentifier: v.id, ...links.ios },
    android: { ...config.android, package: v.id, ...links.android },
  };
};
