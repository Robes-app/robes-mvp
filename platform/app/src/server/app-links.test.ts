import { describe, expect, it } from 'vitest';
import {
  AppleAppSiteAssociation,
  AssetLinks,
  appleAppSiteAssociation,
  assetLinks,
} from './app-links';

const none = { iosAppId: null, android: null };
const fp = Array.from({ length: 32 }, () => 'AB').join(':');
const both = {
  iosAppId: 'ABCDE12345.com.byrobes.app.staging',
  android: { packageName: 'com.byrobes.app.staging', fingerprints: [fp] },
};

describe('apple-app-site-association', () => {
  it('lists no app when unconfigured, and is still a valid file', () => {
    const file = appleAppSiteAssociation(none);
    expect(file).toEqual({ applinks: { details: [] } });
    expect(AppleAppSiteAssociation.parse(file)).toEqual(file);
  });

  it('opens only her screens in the app', () => {
    const file = appleAppSiteAssociation(both);
    const [detail] = file.applinks.details;
    expect(detail?.appIDs).toEqual(['ABCDE12345.com.byrobes.app.staging']);
    const paths = detail?.components.map((c) => c['/']) ?? [];
    expect(paths).toContain('/look/*');
    expect(paths).toContain('/plan');
    expect(paths).toContain('/wardrobe/*');
    expect(paths).toContain('/');
    expect(paths).toContain('/day/*');
    // Web-only pages have no native screen; never a catch-all.
    for (const path of paths) {
      expect(path).not.toMatch(/^\/(api|auth|share|admin|dev|unsubscribe|waitlist|legal)\b/);
      expect(path).not.toMatch(/^\/\*/);
    }
    expect(AppleAppSiteAssociation.parse(file)).toEqual(file);
  });
});

describe('assetlinks.json', () => {
  it('is an empty list when unconfigured', () => {
    expect(assetLinks(none)).toEqual([]);
  });

  it('names the package and its signing certificates', () => {
    const file = assetLinks(both);
    expect(file).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.byrobes.app.staging',
          sha256_cert_fingerprints: [fp],
        },
      },
    ]);
    expect(AssetLinks.parse(file)).toEqual(file);
  });
});
