// Kill switches and rollouts; every key a route can reference must be seeded here.
export const FEATURE_FLAGS = {
  'jobs.fake': { enabled: true, description: 'Fake generation job used by platform smoke tests' },
  uploads: { enabled: true, description: 'Direct photo uploads' },
  'wardrobe.analyse': { enabled: true, description: 'AI read of a wardrobe photo' },
  'looks.generate': { enabled: true, description: 'Style a piece' },
  'today.generate': { enabled: true, description: 'Style it for today' },
  signups: { enabled: true, description: 'New account sign-ups' },
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
