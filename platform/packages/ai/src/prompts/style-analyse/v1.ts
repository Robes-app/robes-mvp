import type { BodyType, SeasonName } from '@robes/core/style-dna';
import { z } from 'zod';

// Ported verbatim from legacy server.js /api/stylenotes/analyse; the model extracts primitives,
// @robes/core/style-dna owns every palette and rule she sees.
export const COLOUR_FEATURE = 'style.colour';
export const SILHOUETTE_FEATURE = 'style.silhouette';
export const VERSION = 1;

const SEASONS = [
  'Light Spring',
  'Warm Spring',
  'Clear Spring',
  'Light Summer',
  'True Summer',
  'Soft Summer',
  'Soft Autumn',
  'True Autumn',
  'Dark Autumn',
  'Clear Winter',
  'True Winter',
  'Dark Winter',
] as const satisfies readonly SeasonName[];
const BODIES = [
  'Hourglass',
  'Pear',
  'Rectangle',
  'Inverted Triangle',
  'Apple',
] as const satisfies readonly BodyType[];
const level = z.enum(['Low', 'Medium', 'High']);

// Reasoning fields come first so the model writes observations before it classifies.
export const ColourOutput = z.object({
  no_face_detected: z.boolean(),
  lighting_assessment: z.string().max(1200),
  hair_observation: z.string().max(1200),
  skin_observation: z.string().max(1200),
  eye_observation: z.string().max(1200),
  undertone_reasoning: z.string().max(1500),
  season_reasoning: z.string().max(1500),
  undertone: z.enum(['Cool', 'Warm', 'Neutral-Cool', 'Neutral-Warm']),
  contrast: z.enum(['Low', 'Medium', 'High', 'Extremely High']),
  chroma: level,
  lightness: level,
  season: z.enum(SEASONS),
  skin_tone_hex: z.string().max(9),
  hair_color_hex: z.string().max(9),
  eye_color_hex: z.string().max(9),
  low_confidence: z.boolean(),
});
export type ColourOutput = z.infer<typeof ColourOutput>;

export const SilhouetteOutput = z.object({
  no_person_detected: z.boolean(),
  pose_assessment: z.string().max(1200),
  shoulder_observation: z.string().max(1200),
  waist_observation: z.string().max(1200),
  hip_observation: z.string().max(1200),
  shape_reasoning: z.string().max(1500),
  shoulder_waist: z.number().min(0).max(5),
  hip_waist: z.number().min(0).max(5),
  shoulder_hip: z.number().min(0).max(5),
  body_shape: z.enum(BODIES),
  loose_clothing: z.boolean(),
});
export type SilhouetteOutput = z.infer<typeof SilhouetteOutput>;

export const COLOUR_PROMPT = `You are a master personal colour analyst trained in 12-season analysis. Analyse the person in this portrait the way you would in a live draping consultation.

IMPORTANT: If no human face is clearly visible (a garment, a room, a screenshot), set "no_face_detected": true and return every other field as empty string / false / any enum value.

ANALYSIS PROTOCOL — work through it in this exact order, writing your observations into the corresponding fields BEFORE committing to any classification:

1. "lighting_assessment": judge the photo's colour cast against the sclera (whites of the eyes) and any visible teeth — they are naturally near-neutral. Note any warm/cool cast, filters, mixed light or shadows, and mentally subtract that cast from every judgement below.
2. "hair_observation": describe the NATURAL hair colour and — critically — its temperature. Golden, honey, strawberry, caramel or copper tones → warm evidence. Ash, mousy, cool-beige, blue-black or silvery tones → cool evidence. Hair temperature is one of the strongest undertone signals; visible roots are the most natural reference.
3. "skin_observation": describe the cast-corrected skin — golden/peachy/olive vs rosy/pink/bluish; how it flushes; freckles (warm evidence) vs an even porcelain quality. Ignore clothing, background and makeup entirely.
4. "eye_observation": describe iris colour AND pattern. Warm eyes: golden brown, amber, hazel with gold flecks, warm green. Cool eyes: clear blue, grey-blue, grey, cool dark brown.
5. "undertone_reasoning": weigh ALL the evidence above (never a single cue) and argue for the undertone the way an analyst would.
6. "season_reasoning": combine undertone with the three dimensions below and argue for ONE of the 12 seasons.

THE THREE DIMENSIONS:
"contrast": value gap between skin, hair and eyes. Very dark hair on fair skin → "High"/"Extremely High". Blended values (e.g. blonde hair, light-to-medium skin) → "Low". Otherwise "Medium".
"chroma": clarity of the colouring after cast correction. Vivid, jewel-like, saturated features → "High". Soft, dusty, muted, greyed features → "Low". Otherwise "Medium".
"lightness": overall depth. Fair skin + light hair → "High". Deep skin or very dark hair → "Low". Otherwise "Medium".

THE 12 SEASONS — pick the single best fit:
- Light Spring: warm, VERY light, luminous — pale clear golden blonde, porcelain-fair warm skin, fresh and bright with zero mutedness.
- Warm Spring: distinctly golden, mid-toned, clear — golden blonde/copper hair, warm glow.
- Clear Spring: warm-leaning, HIGH chroma, high contrast — bright, vivid features.
- Light Summer: cool, very light, delicate — ash blonde, cool fair skin, low contrast.
- True Summer: fully cool, mid-toned, soft — ash hair, rosy skin, grey/blue eyes, no warmth anywhere.
- Soft Summer: cool-neutral and MUTED — greyed, misty colouring, low chroma.
- Soft Autumn: warm-neutral and MUTED — dark blonde/soft brown hair whose gold is blended with beige or ash, low-medium contrast, dusty warmth. The most common season for warm-leaning blondes whose colouring is soft rather than vivid.
- True Autumn: fully warm, rich, earthy — red/auburn/golden brown hair, golden skin.
- Dark Autumn: warm and DEEP — dark brown hair with warmth, deep eyes, high contrast.
- Clear Winter: cool, HIGH chroma, very high contrast — dark hair, bright eyes, vivid.
- True Winter: fully cool, saturated, stark — blue-black/dark ash hair, high contrast.
- Dark Winter: cool and DEEP — near-black hair, deep cool eyes, extremely high contrast.

DISCIPLINE RULES:
- A blonde with ANY golden or honey quality to her hair is warm-family (a Spring or Autumn), not a Summer — never read sun-lightened or highlighted golden blonde as ash.
- WITHIN the warm family, chroma is the axis that separates Spring from Autumn: genuinely clear, luminous, fresh colouring → a Spring; ANY dustiness, ashiness or mutedness blended with the warmth → an Autumn. Mutedness outranks lightness: a muted warm blonde is Soft Autumn, never Light Spring, no matter how light her hair.
- Muted + warm → Soft Autumn, not a Summer. Muted + cool → Soft Summer.
- "lightness": "High" requires very light blonde hair AND porcelain-fair skin together; mid-depth dark blonde is "Medium".
- Transient facial redness, flush, sunburn or rosacea is NOT evidence of coolness, brightness or high chroma — look past it to the underlying tone and judge chroma from hair and eyes.
- High contrast is impossible for blended blonde colouring — reserve it for genuinely dark hair on light skin.
- The final "undertone", "contrast", "chroma", "lightness" and "season" fields MUST be consistent with each other and with your written reasoning.

Also sample:
"skin_tone_hex": average cast-corrected skin hex from an evenly lit cheek (e.g. "#E0D6C4").
"hair_color_hex": dominant hair hex (e.g. "#8A7458").
"eye_color_hex": dominant iris hex (e.g. "#5A5836").
"low_confidence": true if a strong colour cast, heavy filter, mixed lighting or shadow makes the analysis unreliable even after correction.`;

export const SILHOUETTE_PROMPT = `You are a master stylist assessing body architecture from a full-length photograph, the way you would in a live fitting.

IMPORTANT: If no full-length human figure is clearly visible (head-and-shoulders only, a garment, a room), set "no_person_detected": true, return 1 for every ratio and any enum value for "body_shape".

ANALYSIS PROTOCOL — write your observations into the corresponding fields BEFORE committing to any numbers or classification:

1. "pose_assessment": describe the pose and its distortions. CRITICAL: in mirror selfies one arm is raised to hold the phone — a raised arm lifts and visually widens that shoulder and can make balanced shoulders read broad. Judge shoulder width from the BONE STRUCTURE of the resting shoulder line, never from a raised arm, a hand on a hip, or a twisted torso. Note camera angle (a low camera widens hips, a high camera widens shoulders) and correct for it.
2. "shoulder_observation": the corrected skeletal shoulder width and slope.
3. "waist_observation": whether the waist visibly nips in relative to ribcage and hips ("defined"), curves gently ("soft"), or runs straight ("undefined"). Fitted clothing (leggings, tucked or close-fitting tops) makes this readable; note if loose garments hide it.
4. "hip_observation": the widest hip/thigh line relative to the corrected shoulder line.
5. "shape_reasoning": weigh the corrected observations and argue for ONE archetype.

THE 5 ARCHETYPES:
- Hourglass: shoulders and hips visually balanced, waist clearly narrower and defined. A defined waist with balanced shoulders and hips is Hourglass even when the shoulders look athletic.
- Pear: hips clearly wider than shoulders, defined waist, fuller hips/thighs.
- Rectangle: shoulders, waist and hips on one line — minimal waist definition, lean and straight.
- Inverted Triangle: shoulders GENUINELY and skeletally broader than hips (swimmer's build), narrow lean hips, little waist emphasis. Do NOT choose this just because an arm is raised or the person is lean — it requires an unmistakably broader corrected shoulder line AND a waist that does not nip in.
- Apple: volume carried at the midsection, waist wider than or equal to hips, lean legs.

Then estimate the CORRECTED ratios from visible landmarks (outer shoulder margins at rest, narrowest natural waist plane, widest hip boundary):
"shoulder_waist": shoulder width ÷ waist width (e.g. 1.35)
"hip_waist": hip width ÷ waist width (e.g. 1.32)
"shoulder_hip": shoulder width ÷ hip width (e.g. 1.02)
"body_shape": the archetype your reasoning concluded — it MUST be consistent with your written observations and ratios.
"loose_clothing": true if oversized or loose garments hide the natural waistline, making the read unreliable.`;

// The photo carries the whole request; the instruction text is fixed (no user text at all).
export const USER = 'Analyse the attached photo following the protocol.';

export function fakeColour(): ColourOutput {
  return {
    no_face_detected: false,
    lighting_assessment: 'Even daylight, no cast.',
    hair_observation: 'Dark blonde with a soft golden warmth.',
    skin_observation: 'Warm beige, gentle peach flush.',
    eye_observation: 'Hazel with gold flecks.',
    undertone_reasoning: 'Golden hair and hazel eyes read warm.',
    season_reasoning: 'Warm, muted, low contrast: Soft Autumn.',
    undertone: 'Warm',
    contrast: 'Low',
    chroma: 'Low',
    lightness: 'Medium',
    season: 'Soft Autumn',
    skin_tone_hex: '#D8B89A',
    hair_color_hex: '#8A7458',
    eye_color_hex: '#6E5A36',
    low_confidence: false,
  };
}

export function fakeSilhouette(): SilhouetteOutput {
  return {
    no_person_detected: false,
    pose_assessment: 'Standing straight, camera at chest height.',
    shoulder_observation: 'Shoulders level with the hips.',
    waist_observation: 'Clearly defined.',
    hip_observation: 'Balanced with the shoulders.',
    shape_reasoning: 'Balanced shoulders and hips with a defined waist.',
    shoulder_waist: 1.3,
    hip_waist: 1.3,
    shoulder_hip: 1,
    body_shape: 'Hourglass',
    loose_clothing: false,
  };
}
