import type { ExpoConfig } from 'expo/config';
import appConfig from '../app.config';

const base = { name: 'Robes', slug: 'robes', ios: {}, android: {} } as ExpoConfig;

function configFor(variant: string): ExpoConfig {
  const before = process.env.APP_VARIANT;
  process.env.APP_VARIANT = variant;
  try {
    return appConfig({ config: base } as Parameters<typeof appConfig>[0]);
  } finally {
    if (before === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = before;
  }
}

// N4: each store build opens its own host's links; the web serves the matching /.well-known files.
test.each([
  ['staging', 'com.byrobes.app.staging', 'staging.byrobes.com'],
  ['production', 'com.byrobes.app', 'app.byrobes.com'],
])('%s opens links on its own host only', (variant, id, host) => {
  const config = configFor(variant);
  expect(config.ios?.bundleIdentifier).toBe(id);
  expect(config.ios?.associatedDomains).toEqual([`applinks:${host}`]);
  const [filter] = config.android?.intentFilters ?? [];
  expect(filter).toMatchObject({ action: 'VIEW', autoVerify: true });
  const data = [filter?.data ?? []].flat();
  expect(new Set(data.map((d) => d.host))).toEqual(new Set([host]));
  expect(data.every((d) => d.scheme === 'https')).toBe(true);
  expect(data).toContainEqual({ scheme: 'https', host, path: '/look' });
  expect(data).toContainEqual({ scheme: 'https', host, pathPrefix: '/look/' });
  const paths = data.map((d) => d.path ?? d.pathPrefix ?? '');
  for (const path of paths) {
    expect(path).not.toMatch(/^\/($|api|auth|share|admin|unsubscribe|waitlist|legal)\b/);
  }
});

test('a development build claims no host', () => {
  const config = configFor('development');
  expect(config.ios?.associatedDomains).toBeUndefined();
  expect(config.android?.intentFilters).toBeUndefined();
});
