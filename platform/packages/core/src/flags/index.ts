// Kill switches and rollouts; every key a route can reference must be seeded here.
// Seeded by the reference-data migration (generated; never edit once applied).
export const FEATURE_FLAGS = {
  'jobs.fake': { enabled: true, description: 'Fake generation job used by platform smoke tests' },
  uploads: { enabled: true, description: 'Direct photo uploads' },
  'wardrobe.analyse': { enabled: true, description: 'AI read of a wardrobe photo' },
  'looks.generate': { enabled: true, description: 'Style a piece' },
  'today.generate': { enabled: true, description: 'Style it for today' },
  signups: { enabled: true, description: 'New account sign-ups' },
} as const;

// Flags added after the baseline; each is seeded by its own migration (named alongside).
export const ADDED_FEATURE_FLAGS = {
  // 20261015400000_trips_flag: hidden for the MVP launch, as on legacy beta (2eacfb4).
  trips: { enabled: false, description: 'Trips (travel edit) and every door to them' },
  // 20261016500000_paid_route_flags: kill switches for paid routes that had none, seeded on.
  'style.brief': {
    enabled: true,
    description:
      'Robes reads her wardrobe for her Style DNA brief (POST /me/dna/read, style_brief job)',
  },
  'style.analyse': {
    enabled: true,
    description: 'Colour and silhouette reads of her photos (POST /me/style/analyse)',
  },
  'imports.link': {
    enabled: true,
    description: 'Paste a shop link to import a piece (POST /imports/link)',
  },
  'model.portraits': {
    enabled: true,
    description:
      'Draw a new model portrait when her picks need one (avatar_cell job; picks still save when off)',
  },
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS | keyof typeof ADDED_FEATURE_FLAGS;

// Flags the clients read to show or hide doors (GET /me/features).
export const CLIENT_FLAGS = ['trips'] as const satisfies readonly FeatureFlag[];
export type ClientFlag = (typeof CLIENT_FLAGS)[number];
