import { APP_LINK_PREFIXES } from '@robes/core/app-links';
import { z } from 'zod';

// The two files that let an installed phone app open this host's links instead of the browser
// (N4). Native twin: the associatedDomains and intentFilters in mobile/app.config.ts.
export interface AppLinksConfig {
  // `<APPLE_TEAM_ID>.<bundle id>`, or null to list no app.
  iosAppId: string | null;
  android: { packageName: string; fingerprints: string[] } | null;
}

export const AppleAppSiteAssociation = z.object({
  applinks: z.object({
    details: z.array(
      z.object({
        appIDs: z.array(z.string()),
        components: z.array(z.object({ '/': z.string() })),
      }),
    ),
  }),
});

export const AssetLinks = z.array(
  z.object({
    relation: z.array(z.literal('delegate_permission/common.handle_all_urls')),
    target: z.object({
      namespace: z.literal('android_app'),
      package_name: z.string(),
      sha256_cert_fingerprints: z.array(z.string()),
    }),
  }),
);

export function appleAppSiteAssociation(
  config: AppLinksConfig,
): z.infer<typeof AppleAppSiteAssociation> {
  return {
    applinks: {
      details: config.iosAppId
        ? [
            {
              appIDs: [config.iosAppId],
              components: APP_LINK_PREFIXES.flatMap((p) => [{ '/': p }, { '/': `${p}/*` }]),
            },
          ]
        : [],
    },
  };
}

export function assetLinks(config: AppLinksConfig): z.infer<typeof AssetLinks> {
  if (!config.android) return [];
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.android.packageName,
        sha256_cert_fingerprints: config.android.fingerprints,
      },
    },
  ];
}
