// Mirrors the app.consents check constraints (SEC-84); a DB schema test guards drift.
// 'replay' is her yes to recordings with every word hidden, the only kind phone builds from before
// 16 Nov 2026 can write; it no longer starts a recording. 'recordings' is her yes to recordings
// that show her words with every photo hidden (owner, 16 Nov 2026), the only recording kind phone
// builds from before 26 Nov 2026 can write; it no longer starts a recording either.
// 'full_recordings' is her yes to recordings of her whole screen, her photos included (Annie,
// 26 Nov 2026). An older yes never stands for a newer, wider recording.
export const CONSENT_KINDS = [
  'analytics',
  'replay',
  'marketing_email',
  'photo_analysis',
  'look_sharing',
  'recordings',
  'full_recordings',
] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const CONSENT_SOURCES = ['web', 'ios', 'android', 'email'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];
