import { GENDER_IDENTITIES } from '@robes/core/avatar';
import { COLOUR_FAMILY_IDS, PATTERNS, SHADE_IDS } from '@robes/core/colour';
import { STYLE_TYPES } from '@robes/core/style-dna';
import { z } from 'zod';

const name = z.string().trim().max(60);

// You › Notifications; missing keys read as the default so new kinds need no migration.
export const NotificationPrefs = z.object({
  looksReady: z.boolean().default(true),
  // Off until she asks for it (beta: the morning line is opt-in, never on by default).
  morningCue: z.boolean().default(false),
  nudges: z.boolean().default(false),
  receipts: z.boolean().default(true),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefs>;

export const Me = z.object({
  id: z.uuid(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  instagramHandle: z.string().nullable(),
  locale: z.string(),
  timezone: z.string(),
  currency: z.string(),
  homeCity: z.string().nullable(),
  onboarded: z.boolean(),
  notifications: NotificationPrefs,
});
export type Me = z.infer<typeof Me>;

// Which flagged doors her clients show (GET /me/features); flags themselves stay server-side.
export const Features = z.object({ trips: z.boolean() });
export type Features = z.infer<typeof Features>;

export const UpdateMeInput = z
  .object({
    firstName: name.min(1),
    lastName: name,
    instagramHandle: z.string().regex(/^[A-Za-z0-9._]{1,30}$/),
    locale: z.string().max(20),
    timezone: z.string().max(64),
    currency: z.string().regex(/^[A-Z]{3}$/),
    homeCity: z.string().trim().max(120),
    notifications: z.object(NotificationPrefs.shape).partial().strict(),
  })
  .partial();
export type UpdateMeInput = z.infer<typeof UpdateMeInput>;

// Her device's position, sent only after she allowed it; the server keeps ~1 km of it.
export const UpdateLocationInput = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  })
  .strict();
export type UpdateLocationInput = z.infer<typeof UpdateLocationInput>;

export const OnboardingComplete = z.object({ onboardedAt: z.iso.datetime() });

export const DeletionRequest = z.object({
  status: z.enum(['requested', 'running', 'completed', 'failed']),
  requestedAt: z.iso.datetime(),
});
export type DeletionRequest = z.infer<typeof DeletionRequest>;

export const DeletionStatus = z.object({ request: DeletionRequest.nullable() });
export type DeletionStatus = z.infer<typeof DeletionStatus>;

// Typed confirmation so a stray tap can't request deletion.
export const RequestDeletionInput = z.object({ confirm: z.literal('DELETE') });

// You › Style: her colour and silhouette reads (render shapes come from @robes/core/style-dna).
const Swatch = z.object({ name: z.string(), hex: z.string() });
export const ColourProfile = z.object({
  season: z.string(),
  undertone: z.string(),
  contrast: z.string(),
  summary: z.string(),
  undertone_note: z.string(),
  palette: z.array(z.string()),
  neutrals: z.array(Swatch),
  best_colours: z.array(Swatch),
  avoid_colours: z.array(Swatch),
  avoid_note: z.string(),
  proof_best: z.string(),
  proof_less: z.string(),
  seen_on_you: z.array(z.object({ lifts: z.string(), flattens: z.string() })),
  metals: z.array(z.object({ name: z.string(), hexes: z.array(z.string()) })),
  metals_note: z.string(),
  // Set once she picks a season by hand: what her photograph read, so the list stays anchored.
  read_season: z.string().optional(),
});
export const SilhouetteProfile = z.object({
  body_type: z.string(),
  summary: z.string(),
  traits: z.array(z.string()),
  dress_silhouettes: z.array(z.object({ name: z.string(), note: z.string() })),
  neckline_recommendations: z.array(z.string()),
  styling_tips: z.array(z.string()),
});

const colourList = z.array(z.string().trim().min(1).max(40)).max(30);
export const StyleOverrides = z.object({
  lovedColors: colourList.optional(),
  rejectedColors: colourList.optional(),
  measurements: z.record(z.string().max(30), z.string().trim().max(30)).optional(),
});
export type StyleOverrides = z.infer<typeof StyleOverrides>;

// Her colours and prints (legacy a61f211): -1 avoid, 1 love, a missing key is no view; a shade
// she set overrides its family.
const ids = (list: readonly string[]) => z.enum(list as [string, ...string[]]);
const pref = z.union([z.literal(-1), z.literal(1)]);
export const Palette = z.object({
  fam: z.partialRecord(ids(COLOUR_FAMILY_IDS), pref),
  // A shade may say No view (0) under a family she loves or avoids.
  shade: z.partialRecord(ids(SHADE_IDS), z.union([pref, z.literal(0)])),
  print: z.partialRecord(ids(PATTERNS.filter((p) => p.pref).map((p) => p.id)), pref),
});

// Getting to know you (onboarding, 30 Oct): saved once, on Get started. Every answer but her name
// (already saved) is optional, and an older phone build finishes with none.
export const CompleteOnboardingInput = z
  .object({
    identity: z.enum(GENDER_IDENTITIES),
    // Archetype names, in tap order.
    styles: z.array(z.enum(STYLE_TYPES)).max(STYLE_TYPES.length),
    brands: z.array(z.string().trim().min(1).max(80)).max(40),
    // Love (1) or avoid (-1) by colour family; a missing family is no view.
    colours: z.partialRecord(ids(COLOUR_FAMILY_IDS), pref),
  })
  .partial()
  .strict();
export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingInput>;
export type Palette = z.infer<typeof Palette>;

export const StyleProfile = z.object({
  colour: ColourProfile.nullable(),
  silhouette: SilhouetteProfile.nullable(),
  overrides: z.object({
    lovedColors: z.array(z.string()),
    rejectedColors: z.array(z.string()),
    measurements: z.record(z.string(), z.string()),
  }),
  // Defaulted across version skew, so an older server's response still parses.
  palette: Palette.default({ fam: {}, shade: {}, print: {} }),
  updatedAt: z.iso.datetime().nullable(),
});
export type StyleProfile = z.infer<typeof StyleProfile>;

export const AnalyseStyleInput = z.object({
  kind: z.enum(['colour', 'silhouette']),
  // A `headshot` upload for colour, a `full_length` upload for silhouette.
  assetId: z.uuid(),
});
export type AnalyseStyleInput = z.infer<typeof AnalyseStyleInput>;

// SEC-81: her data as one JSON file, built within minutes; the link lasts 7 days.
export const DataExport = z.object({
  id: z.uuid(),
  status: z.enum(['requested', 'running', 'ready', 'expired', 'failed']),
  requestedAt: z.iso.datetime(),
  readyAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  // Signed for at most an hour; fetch the status again for a fresh one.
  downloadUrl: z.url().nullable(),
});
export type DataExport = z.infer<typeof DataExport>;

export const DataExportStatus = z.object({ export: DataExport.nullable() });
export type DataExportStatus = z.infer<typeof DataExportStatus>;

// Native push (M7): an Expo push token for this device.
export const ExpoPushToken = z
  .string()
  .regex(/^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]{10,100}\]$/);
export const RegisterPushTokenInput = z.object({
  expoToken: ExpoPushToken,
  platform: z.enum(['ios', 'android']),
  appVersion: z
    .string()
    .regex(/^\d+(\.\d+)*$/)
    .max(32)
    .optional(),
});
export const PushTokenParams = z.object({ token: ExpoPushToken });

// You › Your model (M6 task 1): her picks over what her photo reads say. The swatches are data for
// the pickers; the cell is the shared reference portrait her looks are rendered on.
export const ModelPresence = z.enum(GENDER_IDENTITIES);
const stop = z.number().int().min(-2).max(2).nullable();
export const TwinAdj = z.object({ shoulders: stop, bust: stop, hips: stop });
export type TwinAdj = z.infer<typeof TwinAdj>;

export const Model = z.object({
  filed: z.boolean(),
  presence: ModelPresence,
  skin: z.number().int().min(0).max(7),
  hair: z.number().int().min(0).max(4),
  line: z.enum(['soft', 'straight']).nullable(),
  frame: z.enum(['fuller', 'narrower']).nullable(),
  source: z.enum(['read', 'mixed', 'hand']),
  reads: z.object({ colour: z.boolean(), silhouette: z.boolean() }),
  cellId: z.string(),
  cell: z.object({
    status: z.enum(['none', 'pending', 'ready', 'failed']),
    // Signed for the caller; null until the portrait exists.
    imageUrl: z.url().nullable(),
  }),
  swatches: z.object({ skin: z.array(z.string()), hair: z.array(z.string()) }),
  // Whether skin and hair are hand picks over what her close-up shows.
  skinSet: z.boolean(),
  hairSet: z.boolean(),
  // The twin's three sliders (−2…+2); null on a scale is "from your facts".
  adj: TwinAdj,
  // Her close-up, signed for her alone; null until one is on file.
  closeUpUrl: z.url().nullable(),
  // Her digital twin: drawn from her close-up and her line. `current` is false while a twin drawn
  // from older inputs still stands (shown until the redraw lands).
  twin: z.object({
    status: z.enum(['none', 'pending', 'ready', 'failed']),
    current: z.boolean(),
    imageUrl: z.url().nullable(),
  }),
  // What a new look stands on in the composer: her twin, else her filed cell, else the first
  // generic Robes model (`generic`) while she has none. Signed; null until that portrait exists.
  stand: z.object({ imageUrl: z.url().nullable(), generic: z.boolean() }).optional(),
});
export type Model = z.infer<typeof Model>;

export const UpdateModelInput = z
  .object({
    presence: ModelPresence,
    skin: z.number().int().min(0).max(7),
    hair: z.number().int().min(0).max(4),
    line: z.enum(['soft', 'straight']).nullable(),
    frame: z.enum(['fuller', 'narrower']).nullable(),
    // A scale moved, or {} back to her facts.
    adj: TwinAdj.partial().strict(),
  })
  .partial()
  .strict();
export type UpdateModelInput = z.infer<typeof UpdateModelInput>;
