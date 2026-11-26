// Mirrors the app.consents check constraints (SEC-84); a DB schema test guards drift.
// 'replay' is her yes to recordings with every word hidden, the only kind phone builds from before
// 16 Nov 2026 can write; it no longer starts a recording. 'recordings' is her yes to recordings
// that show her words (owner, 16 Nov 2026), so an older yes never stands for the newer recording.
export const CONSENT_KINDS = [
  'analytics',
  'replay',
  'marketing_email',
  'photo_analysis',
  'look_sharing',
  'recordings',
] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const CONSENT_SOURCES = ['web', 'ios', 'android', 'email'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];
