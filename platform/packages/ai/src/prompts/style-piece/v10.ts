import { AVATAR_IDENTITY } from './v3';
import * as v8 from './v8';

// v10 (testing 17 Nov, twin likeness): a frame drawn on her twin carries her close-up as IMAGE 2
// and her figure in words, as legacy beta's modelRefsForUser did for every look on her twin; the
// key piece and her pieces' photographs follow from IMAGE 3. Without a face or a figure the image
// prompt is v8's byte for byte, and the text prompts are v9's.
export * from './v9';
export const VERSION = 10;

type ImageOpts = Parameters<typeof v8.buildImagePrompt>[0] & {
  // Her close-up rides right after her twin (IMAGE 1).
  hasFace?: boolean;
  // Her figure in words beside her twin; '' for none.
  figure?: string;
};

export function buildImagePrompt(opts: ImageOpts): string {
  const { hasFace = false, figure = '', ...rest } = opts;
  const base = v8.buildImagePrompt(rest);
  if (!opts.hasModel || (!hasFace && !figure)) return base;
  const her = opts.wearer === 'man' ? 'His' : 'Her';
  const shifted = hasFace
    ? base.replace(/IMAGE (\d+)/g, (_, n: string) => `IMAGE ${Number(n) + 1}`)
    : base;
  const face = hasFace
    ? 'IMAGE 2 is a close-up photograph of the same person: match the face to IMAGE 2 exactly — the same features, the same skin, the same hair; do not age, idealise or retouch them. '
    : '';
  const figureLine = figure ? `${her} figure, as the first image shows it: ${figure} ` : '';
  const identity = (opts.setting ?? 'scene') === 'studio' ? v8.STUDIO_IDENTITY : AVATAR_IDENTITY;
  const out = shifted.replace(identity, `${identity}${face}${figureLine}`);
  if (out === shifted) throw new Error('style-piece v10: model identity line moved');
  return out;
}
