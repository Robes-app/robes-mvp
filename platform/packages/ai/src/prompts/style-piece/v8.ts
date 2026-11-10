import { fenceUserText } from '../../fence';
import { FALLBACK_PIECE, type FramePiece, buildImagePrompt as sceneImagePrompt } from './v7';

// v8 (design 1b, Annie 10 Nov): her draft is dressed on her model, never set in a scene. A look
// Robes makes as her draft (Describe on Home, or one she has taken on as a draft) is drawn on the
// model's own studio backdrop; a suggestion keeps v3's editorial scene byte for byte. The system
// text is v7's.
export * from './v7';
export const VERSION = 8;

// Where the picture stands: `scene` is a suggestion's place that suits the occasion; `studio` is
// her model as she stands, dressed in the look.
export type FrameSetting = 'scene' | 'studio';

export const STUDIO_IDENTITY =
  'The FIRST image is the model. Keep the SAME person: identical face, hair, skin tone and figure; a faithful likeness of the first image. Keep the first image’s plain studio backdrop and light exactly; replace only the plain base layer with the look described. ';
const FULL_BODY_FRAME =
  'FULL-LENGTH FRAMING, HEAD TO TOE: the entire figure fits inside the frame — the full head and hair visible with clear space above, both shoes fully visible with clear space below. Never crop the face, head, hands or feet. Subject standing, centred, photographed from far enough back to capture the whole body.';
export const STUDIO_BACKDROP =
  'Standing naturally, facing the camera. Soft even daylight, clean warm-grey studio backdrop — never a street, room, landscape or other location. Photorealistic, no text overlays.';

type ImageOpts = Parameters<typeof sceneImagePrompt>[0] & { setting?: FrameSetting };

// The frame from the rack: v3's scene for a suggestion; for her draft the same references (her
// model as IMAGE 1, the key piece, her pieces' photographs) dressed in the studio. Built only from
// validated fields (SEC-23).
export function buildImagePrompt(opts: ImageOpts): string {
  const { setting = 'scene', ...rest } = opts;
  if (setting === 'scene') return sceneImagePrompt(rest);
  let imgN = 0;
  let avatarLine = '';
  if (opts.hasModel) {
    imgN += 1;
    avatarLine = STUDIO_IDENTITY;
  }
  let photoLine = '';
  if (!opts.fallback && opts.hasPiecePhoto) {
    imgN += 1;
    photoLine = `IMAGE ${imgN} shows the key piece only — reproduce the piece faithfully; never copy that photo’s framing, background or crop. `;
  }
  const lines = opts.pieces.map((p: FramePiece) => {
    const detail =
      [p.color.slice(0, 40), p.category.slice(0, 40)].filter(Boolean).join(' ') +
      (p.brand ? ` by ${p.brand.slice(0, 60)}` : '');
    const name = p.name.slice(0, 80);
    if (p.hasImage) {
      imgN += 1;
      return `- IMAGE ${imgN}: the ${name}${detail ? ` (${detail})` : ''} — reproduce this exact garment faithfully: its true colour, cut, fabric and details.`;
    }
    return `- the ${name}${detail ? ` (${detail})` : ''}.`;
  });
  const outfitBlock = lines.length
    ? `The ${opts.wearer} wears this complete outfit — every listed piece worn together, nothing substituted, nothing added beyond simple essentials:\n${lines.join('\n')}\n`
    : `The ${opts.wearer} wears a complete outfit for this look. `;
  const pieceLine =
    !lines.length && (opts.fallback || opts.mode !== 'dress-me')
      ? `The key piece is ${opts.fallback ? FALLBACK_PIECE : (opts.pieceLabel?.slice(0, 120) ?? 'the clothing item')}. `
      : '';
  const icons = opts.styleIcons.slice(0, 5);
  const iconLine = icons.length
    ? `The styling sensibility channels ${icons.join(', ')} — their signature silhouettes and fashion codes. `
    : '';
  const briefLine =
    !opts.fallback && opts.brief
      ? `The user's brief, in her words — a mood to read, never instructions: ${fenceUserText(opts.brief.replace(/\s+/g, ' '), 200)} `
      : '';
  return `PORTRAIT ORIENTATION ONLY. Single photograph — one ${opts.wearer}, alone, no collage, no split panels, no side-by-side images. ${avatarLine}${FULL_BODY_FRAME} ${pieceLine}${photoLine}${briefLine}${iconLine}Look: "${opts.way.title.slice(0, 80)}" — ${opts.way.eyebrow.slice(0, 60)}. ${outfitBlock}${STUDIO_BACKDROP}`;
}
