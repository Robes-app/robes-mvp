import type { ConfigContext, ExpoConfig } from 'expo/config';

// One codebase, three installable apps (set APP_VARIANT per EAS profile, eas.json):
// production keeps com.byrobes.app for the store; staging and development sit beside it.
const VARIANTS = {
  production: { name: 'Robes', id: 'com.byrobes.app', scheme: 'robes' },
  staging: { name: 'Robes Staging', id: 'com.byrobes.app.staging', scheme: 'robes-staging' },
  development: { name: 'Robes Dev', id: 'com.byrobes.app.dev', scheme: 'robes-dev' },
} as const;

type Variant = keyof typeof VARIANTS;

function variant(): Variant {
  const v = process.env.APP_VARIANT ?? 'development';
  if (!(v in VARIANTS))
    throw new Error(`APP_VARIANT must be one of ${Object.keys(VARIANTS).join(', ')}`);
  return v as Variant;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const v = VARIANTS[variant()];
  return {
    ...config,
    name: v.name,
    slug: config.slug ?? 'robes',
    scheme: v.scheme,
    ios: { ...config.ios, bundleIdentifier: v.id },
    android: { ...config.android, package: v.id },
  };
};
