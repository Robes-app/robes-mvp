// The app versions production serves (ADR-022), changed only by PR into `beta` and the sync.
// `latest` rises once Apple has approved that build for the public beta; `minimum` rises as the
// second step of a two-step change (docs/runbooks/ios-release.md §5–6). Below `minimum` every
// request answers 426 and the app shows only the update screen.
export const APP_VERSIONS = { minimum: '0.8.0', latest: '0.8.0' } as const;
