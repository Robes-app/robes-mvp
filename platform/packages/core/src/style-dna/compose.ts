import { BODIES, CONTRAST_COPY, METAL_GRADIENTS, SEASONS, UNDERTONE_NOTE } from './catalog';
import { classifyBody, classifySeason } from './classify';
import type {
  BodyPrimitives,
  BodyType,
  ColourPrimitives,
  Contrast,
  MetalName,
  SeasonName,
  Undertone,
} from './types';

// Own-key lookups only: a primitive like "constructor" must never match a catalog entry.
function isKey<T extends object>(record: T, key: unknown): key is keyof T {
  return typeof key === 'string' && Object.hasOwn(record, key);
}

const CONTRAST_DISPLAY: Record<Contrast, string> = {
  Low: 'Low, blended',
  Medium: 'Medium',
  High: 'High contrast',
  'Extremely High': 'High contrast',
};
const UNDERTONE_DISPLAY: Record<Undertone, string> = {
  Warm: 'Warm',
  Cool: 'Cool',
  'Neutral-Warm': 'Neutral',
  'Neutral-Cool': 'Neutral',
};

const nullable = (v: unknown): unknown => v || null;

// Colour primitives → what she sees (render) + the stored profile (dna).
export function buildColorHarmony(x: ColourPrimitives) {
  let undertone: Undertone = isKey(UNDERTONE_NOTE, x.undertone)
    ? x.undertone
    : x.low_confidence
      ? 'Neutral-Warm'
      : 'Warm';
  const contrast: Contrast = isKey(CONTRAST_COPY, x.contrast) ? x.contrast : 'Medium';
  const primitiveSeason = classifySeason({ ...x, undertone, contrast });
  // The model's holistic season call wins; the primitive mapping is the fallback and cross-check.
  const holistic = isKey(SEASONS, x.season);
  const season: SeasonName = holistic ? (x.season as SeasonName) : primitiveSeason;
  const s = SEASONS[season];
  const warmSeason = s.family === 'warm';
  const warmUndertone = undertone === 'Warm' || undertone === 'Neutral-Warm';
  if (warmSeason !== warmUndertone) undertone = warmSeason ? 'Neutral-Warm' : 'Neutral-Cool';
  const render = {
    season,
    undertone: UNDERTONE_DISPLAY[undertone],
    contrast: CONTRAST_DISPLAY[contrast],
    summary: s.summary,
    undertone_note: UNDERTONE_NOTE[undertone],
    palette: s.palette.flat(),
    neutrals: s.neutrals,
    best_colours: [...s.stars, ...s.accents],
    avoid_colours: s.avoid,
    avoid_note: s.avoid_note,
    proof_best: s.proof_best,
    proof_less: s.proof_less,
    seen_on_you: s.seen_on_you,
    metals: s.metals.approved.map((name) => ({
      name,
      hexes: isKey(METAL_GRADIENTS, name)
        ? METAL_GRADIENTS[name as MetalName]
        : METAL_GRADIENTS.Gold,
    })),
    metals_note: s.metals_note,
  };
  const dna = {
    archetype_name: season,
    verified_undertone: undertone,
    calculated_contrast: contrast,
    refinement_needed: Boolean(x.low_confidence),
    classification: {
      source: holistic ? 'holistic' : 'primitive_mapping',
      primitive_season: primitiveSeason,
      agreement: primitiveSeason === season,
      reasoning: nullable(x.season_reasoning),
    },
    extracted_values: {
      skin_tone_hex: nullable(x.skin_tone_hex),
      hair_color_hex: nullable(x.hair_color_hex),
      eye_color_hex: nullable(x.eye_color_hex),
    },
    eighteen_shade_matrix: {
      row_1_warm_mutes: s.palette[0],
      row_2_earth_greens: s.palette[1],
      row_3_deep_velvets: s.palette[2],
    },
    functional_sub_palettes: {
      best_neutrals: s.neutrals.map((n) => n.name),
      primary_stars: s.stars.map((n) => n.name),
      secondary_accents: s.accents.map((n) => n.name),
      avoid_list: s.avoid.map((n) => n.name),
    },
    metals_rules: {
      finish_type: s.metals.finish,
      approved_metals: s.metals.approved,
      prohibited_metals: s.metals.prohibited,
    },
    stylist_voice: s.voice,
  };
  return { render, dna };
}
export type ColorHarmonyDna = ReturnType<typeof buildColorHarmony>['dna'];

const round = (v: unknown): number | null =>
  Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null;

// Body primitives → render + dna; the model's pose-corrected shape call wins over raw ratios.
export function buildSilhouette(x: BodyPrimitives) {
  const ratio = classifyBody(x);
  const holistic = isKey(BODIES, x.body_shape) ? (x.body_shape as BodyType) : null;
  const body_type = holistic ?? ratio.body_type;
  const b = BODIES[body_type];
  const render = {
    body_type,
    summary: b.summary,
    traits: b.traits,
    dress_silhouettes: b.dresses,
    neckline_recommendations: b.necklines,
    styling_tips: b.tips,
  };
  const dna = {
    body_type,
    fallback_applied: holistic ? false : ratio.fallback_applied,
    classification: {
      source: holistic ? 'holistic' : 'ratio_thresholds',
      ratio_body_type: ratio.body_type,
      agreement: ratio.body_type === body_type,
      reasoning: nullable(x.shape_reasoning),
    },
    geometric_ratios: {
      shoulder_to_waist: round(x.shoulder_waist),
      hip_to_waist: round(x.hip_waist),
      shoulder_to_hip: round(x.shoulder_hip),
    },
    visual_traits: b.traits,
    architectural_rules: {
      dress_silhouettes: b.dresses.map((d) => d.name),
      necklines: b.necklines,
      styling_maxims: b.maxims,
    },
  };
  return { render, dna };
}
export type SilhouetteDna = ReturnType<typeof buildSilhouette>['dna'];
