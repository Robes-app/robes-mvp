import type { RenderPiece as RenderPieceV1 } from './v1';

// v2 (legacy 2026-10-01 + 10-07): how a piece is worn rides each garment line ("Worn: tucked at
// the front"), and FRAME MODE re-dresses Robes' own frame of a look — IMAGE 1 is that photograph,
// the same person, place, light and pose, only the clothes change; her model never replaces it.
export {
  buildCellPrompt,
  CELL_FEATURE,
  describeCell,
  MAX_PIECE_REFERENCES,
  RENDER_FEATURE,
} from './v1';
export const VERSION = 2;
export const FRAME_FEATURE = 'avatar.frame';

export interface RenderPiece extends RenderPieceV1 {
  styled?: string | null;
}

const FULL_BODY_FRAME =
  'FULL-LENGTH FRAMING, HEAD TO TOE: the entire figure fits inside the frame — the full head and hair visible with clear space above, both shoes fully visible with clear space below. Never crop the face, head, hands or feet. Subject standing, centred, photographed from far enough back to capture the whole body.';

const clean = (s: string | null | undefined, n: number) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

function lines(pieces: readonly RenderPiece[]): string[] {
  let imageN = 1;
  return pieces.map((p) => {
    const name = p.name.slice(0, 120);
    const detail =
      [p.color?.slice(0, 40), p.category?.slice(0, 40)].filter(Boolean).join(' ') +
      (p.brand ? ` by ${p.brand.slice(0, 60)}` : '');
    const said = detail ? ` (${detail})` : '';
    const worn = clean(p.styled, 120);
    const wornLine = worn ? ` Worn: ${worn}.` : '';
    if (p.hasImage) {
      imageN += 1;
      return `- IMAGE ${imageN}: the ${name}${said} — reproduce this exact garment faithfully: its true colour, cut, fabric and details.${wornLine}`;
    }
    return `- the ${name}${said}.${wornLine}`;
  });
}

const STUDIO =
  'Soft even daylight, clean warm-grey studio backdrop, photorealistic editorial photography, no text overlays, no collage, one single image.';

// Her look on her model; byte for byte v1 when no piece carries a styling note.
export function buildRenderPrompt(gender: 'woman' | 'man', pieces: readonly RenderPiece[]): string {
  const man = gender === 'man';
  const outfit =
    pieces.length > 1
      ? 'this complete outfit — every listed piece worn together, nothing substituted, nothing extra beyond simple essentials'
      : 'this piece, worn over the plain fitted base layer from IMAGE 1 — nothing substituted, nothing extra';
  return (
    `Create one photorealistic editorial photograph. IMAGE 1 is the model. Keep the SAME ${man ? 'man' : 'woman'}: identical face, hair, skin tone and figure; a faithful likeness of IMAGE 1. ` +
    `Dress ${man ? 'him' : 'her'} in ${outfit}:\n${lines(pieces).join('\n')}\n` +
    `Standing naturally, facing the camera. ${FULL_BODY_FRAME} ${STUDIO} Generate the single photograph now.`
  );
}

// FRAME MODE: IMAGE 1 is Robes' existing photograph of the look; photographed pieces follow.
export function buildFrameRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
): string {
  const man = gender === 'man';
  return (
    `Create one photorealistic editorial photograph. IMAGE 1 is an existing photograph of this look. Keep the SAME ${man ? 'man' : 'woman'}: identical face, hair, skin tone and figure — a faithful likeness of IMAGE 1. Keep the SAME location, backdrop, light, time of day, pose and framing as IMAGE 1: this is the same photograph with the clothes changed, never a new scene. ` +
    `Re-dress ${man ? 'him' : 'her'} in this complete outfit — every listed piece worn together, nothing from the outfit in IMAGE 1 kept unless it is listed here, nothing extra beyond simple essentials:\n` +
    `${lines(pieces).join('\n')}\n` +
    `${FULL_BODY_FRAME} No text overlays, no collage, one single image. Generate the single photograph now.`
  );
}
