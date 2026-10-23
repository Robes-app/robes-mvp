import type { TwinSpec } from '@robes/core/avatar';
import { type RenderPiece, buildRenderPrompt as v2Render } from './v2';

// v3 (legacy 2026-10-20, the digital twin): one reference image per account, drawn from her
// close-up (the face — a reference carries a face) and words for her line (a reference does not
// carry proportions). Renders on a twin carry the close-up as IMAGE 2 and one figure line.
export {
  buildCellPrompt,
  buildFrameRenderPrompt,
  CELL_FEATURE,
  describeCell,
  FRAME_FEATURE,
  MAX_PIECE_REFERENCES,
  RENDER_FEATURE,
  type RenderPiece,
} from './v2';
export const VERSION = 3;
export const TWIN_FEATURE = 'avatar.twin';

const SKIN_WORDS = [
  'deep espresso brown',
  'rich mahogany brown',
  'warm chestnut brown',
  'golden tan',
  'warm honey beige',
  'soft warm sand',
  'light warm peach',
  'fair cool porcelain',
];
const HAIR_WORDS = [
  'jet black',
  'dark espresso brown',
  'chestnut brown',
  'golden caramel blonde',
  'light ash blonde',
];
const FULL_BODY_FRAME =
  'FULL-LENGTH FRAMING, HEAD TO TOE: the entire figure fits inside the frame — the full head and hair visible with clear space above, both shoes fully visible with clear space below. Never crop the face, head, hands or feet. Subject standing, centred, photographed from far enough back to capture the whole body.';
const STUDIO =
  'Soft even daylight, clean warm-grey studio backdrop, photorealistic editorial photography, no text overlays, no collage, one single image.';

type Words = Partial<Record<'-2' | '-1' | '1' | '2', string>>;
const CHEST: Words = {
  '-2': 'a narrow chest',
  '-1': 'a lean chest',
  '1': 'a broad chest',
  '2': 'a very broad, deep chest',
};
const BUST: Words = {
  '-2': 'a very small bust',
  '-1': 'a small bust',
  '1': 'a full bust',
  '2': 'a very full bust',
};
const SHOULDERS: Words = {
  '-2': 'narrow shoulders, clearly narrower than the hips',
  '-1': 'slightly narrow shoulders',
  '1': 'shoulders a little broader than the hips',
  '2': 'broad shoulders, clearly broader than the hips',
};
const HIPS: Words = {
  '-2': 'narrow, straight hips',
  '-1': 'slim hips',
  '1': 'full hips, fuller than the shoulders',
  '2': 'very full, rounded hips',
};
const word = (w: Words, stop: number) => w[String(stop) as keyof Words];

// Size and proportion words, never a weight. Prompt-side only; never consumer copy.
export function twinFigureLine(s: TwinSpec): string {
  const man = s.gender === 'man';
  const frame =
    s.sizeUk <= 6
      ? 'a slight, slender'
      : s.sizeUk <= 10
        ? 'a slim'
        : s.sizeUk <= 14
          ? 'an average'
          : s.sizeUk <= 18
            ? 'a fuller'
            : 'a full, generous';
  let lead = `${frame} ${man ? 'build' : 'frame'}`;
  if (s.heightCm && s.heightCm <= 158) lead = `petite, ${lead}`;
  if (s.heightCm && s.heightCm >= (man ? 186 : 175)) lead = `tall and long-limbed, ${lead}`;
  const parts = [
    lead,
    word(man ? CHEST : BUST, s.stops.bust),
    word(SHOULDERS, s.stops.shoulders),
    word(HIPS, s.stops.hips),
    s.waistDiff === null
      ? undefined
      : s.waistDiff >= 18
        ? 'a clearly defined waist'
        : s.waistDiff >= 10
          ? 'a gently defined waist'
          : 'a straight line through the waist',
  ].filter((p): p is string => Boolean(p));
  return `${parts.join(', ')}.`;
}

// The whole descriptor: with a close-up the face, skin and hair come from the photograph (a hand
// pick names the tone to follow instead); without one, the catalog words stand in.
export function twinDescriptor(s: TwinSpec): string {
  const man = s.gender === 'man';
  const She = man ? 'He' : 'She';
  const her = man ? 'his' : 'her';
  const Her = man ? 'His' : 'Her';
  const skinWord = SKIN_WORDS[s.skin] ?? SKIN_WORDS[3];
  const hairWord = HAIR_WORDS[s.hair] ?? HAIR_WORDS[1];
  const age = `${She} is ${s.age} years old — keep ${her} exactly that age, never younger, never older.`;
  let look: string;
  if (s.hasFace) {
    const skin = s.skinSet
      ? `${Her} skin tone is ${skinWord} (follow this over the photograph's lighting).`
      : `${Her} skin tone exactly as in the photograph.`;
    const hair = s.hairSet
      ? `${Her} hair is ${hairWord}, in the photograph's own texture and length${man ? '' : ', worn down'}.`
      : `${Her} hair exactly as in the photograph — its colour, texture and length${man ? '' : ', worn down'}.`;
    look = `IMAGE 1 is a photograph of this exact person. Reproduce ${her} face exactly — the bone structure, eyes, eyebrows, nose, mouth and expression lines as photographed. Do not idealise, do not retouch, do not change ${her} features. ${skin} ${hair}`;
  } else {
    look = `${She} has ${skinWord} skin and ${man ? `short ${hairWord} hair` : `long ${hairWord} hair worn down`}.`;
  }
  return `${look} ${age} ${She} has ${twinFigureLine(s)}`;
}

// Her reference portrait on the seamless base layer, so garments later read against it.
export function buildTwinPrompt(s: TwinSpec): string {
  const man = s.gender === 'man';
  const base = man
    ? 'He wears a minimal fitted base layer in one soft neutral tone close to his skin — a plain fitted crew-neck T-shirt and plain fitted knee-length shorts — barefoot, no accessories, no jewellery, no logos, no patterns.'
    : 'She wears a minimal seamless base layer in one soft neutral tone close to her skin — a fitted scoop-neck stretch tank top and matching fitted mid-thigh shorts, like a seamless shapewear set — barefoot, no accessories, no jewellery, no logos, no patterns.';
  return `Full-length editorial fashion photograph of one ${man ? 'man' : 'woman'}, alone — a recurring model, and this is ${man ? 'his' : 'her'} reference portrait. ${twinDescriptor(s)} ${base} Standing relaxed, facing the camera directly, arms at ${man ? 'his' : 'her'} sides, calm expression. ${FULL_BODY_FRAME} ${STUDIO}`;
}

// Her look on her model. On a twin, IMAGE 2 is her close-up (pieces follow from IMAGE 3) and the
// figure line restates her proportions; without either it is v2 byte for byte.
export function buildRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  twin?: { face: boolean; figure: string },
): string {
  const base = v2Render(gender, pieces);
  if (!twin) return base;
  const man = gender === 'man';
  const renumbered = twin.face
    ? base.replace(/- IMAGE (\d+):/g, (_, n: string) => `- IMAGE ${Number(n) + 1}:`)
    : base;
  const face = twin.face
    ? 'IMAGE 2 is a close-up photograph of the same person: match the face to IMAGE 2 exactly — the same features, the same skin, the same hair. '
    : '';
  const figure = twin.figure
    ? `${man ? 'His' : 'Her'} figure, as IMAGE 1 shows it: ${twin.figure} `
    : '';
  return renumbered.replace(
    'a faithful likeness of IMAGE 1. ',
    `a faithful likeness of IMAGE 1. ${face}${figure}`,
  );
}
