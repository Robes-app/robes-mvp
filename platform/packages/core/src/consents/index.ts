// Mirrors the app.consents check constraints (SEC-84); a DB schema test guards drift.
export const CONSENT_KINDS = ['analytics', 'replay', 'marketing_email', 'photo_analysis'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const CONSENT_SOURCES = ['web', 'ios', 'android', 'email'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];
