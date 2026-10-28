// Web paths that open the phone app when it is installed (iOS universal links, Android App Links):
// the home page exactly, and each prefix exactly plus everything under it. An explicit list of the
// screens the app has (mobile/src/lib/links.ts maps them), never a catch-all: /api (OAuth
// callbacks finish in the browser), /auth, /share (a shared look stays a web page), /legal,
// /unsubscribe, /waitlist, /admin and /dev have no native screen and stay in the browser.
// Query strings (?from=email) don't affect matching. The web serves these in its AASA and
// assetlinks (app/src/server/app-links.ts); mobile/app.config.ts declares them natively.
export const APP_LINK_HOME = '/';

export const APP_LINK_PREFIXES = [
  '/today',
  '/wardrobe',
  '/piece',
  '/looks',
  '/look',
  '/idea',
  '/plan',
  '/day',
  '/trip',
  '/you',
  '/onboarding',
  '/soon',
] as const;
