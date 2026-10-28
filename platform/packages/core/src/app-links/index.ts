// Web paths that open the phone app when it is installed (iOS universal links, Android App Links):
// each prefix and everything under it. Only her signed-in screens: never /api (OAuth callbacks
// finish in the browser), /auth, /share (a shared look stays a web page), /unsubscribe, /waitlist,
// /legal or /admin. The web serves them in its AASA and assetlinks (app/src/server/app-links.ts);
// mobile/app.config.ts declares the same list in the native intent filters (a mobile test keeps
// the two in step).
export const APP_LINK_PREFIXES = [
  '/today',
  '/wardrobe',
  '/piece',
  '/looks',
  '/look',
  '/plan',
  '/you',
] as const;
