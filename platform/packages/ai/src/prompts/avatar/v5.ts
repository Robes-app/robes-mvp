import type { RenderPiece } from './v3';
import { buildFrameRenderPrompt as v4Frame } from './v4';

// v5 (testing 17 Nov: a Robes model aged ~25 years over a day of edits): a re-dressed frame keeps
// IMAGE 1 for the scene only and takes the person from the model's own portrait (IMAGE 2, her
// close-up as IMAGE 3 on a twin), so each redraw is drawn from the model, never a copy of a copy.
// Legacy beta never drifted because every redraw of her own look started from her twin and its
// close-up (modelRefsForUser). Without an anchor every prompt is v4 byte for byte.
export * from './v4';
export const VERSION = 5;

export interface FrameAnchor {
  // Her close-up rides after the portrait (twin only).
  face: boolean;
  // Her figure in words (twin only; a reference carries a face, not proportions); '' for none.
  figure: string;
}

const LIKENESS_OF_FRAME = (who: string) =>
  `Keep the SAME ${who}: identical face, hair, skin tone and figure — a faithful likeness of IMAGE 1. `;

export function buildFrameRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  note?: string | null,
  anchor?: FrameAnchor,
): string {
  const base = v4Frame(gender, pieces, note);
  if (!anchor) return base;
  const man = gender === 'man';
  const who = man ? 'man' : 'woman';
  const her = man ? 'his' : 'her';
  const Her = man ? 'His' : 'Her';
  const shift = anchor.face ? 2 : 1;
  const renumbered = base.replace(
    /- IMAGE (\d+):/g,
    (_, n: string) => `- IMAGE ${Number(n) + shift}:`,
  );
  const face = anchor.face
    ? `IMAGE 3 is a close-up photograph of the same person: match the face to IMAGE 3 exactly — the same features, the same skin, the same hair. `
    : '';
  const figure = anchor.figure ? `${Her} figure, as IMAGE 2 shows it: ${anchor.figure} ` : '';
  const person =
    `IMAGE 2 is the reference portrait of the person in this photograph. Take ${her} face, hair, skin tone, figure and age from IMAGE 2${anchor.face ? ' and IMAGE 3' : ''}, never from IMAGE 1: wherever the person in IMAGE 1 differs from IMAGE 2 — older or younger, other features, other hair — draw the person as IMAGE 2 shows ${man ? 'him' : 'her'}. ` +
    `Reproduce the ${who} in IMAGE 2 exactly; do not age, idealise or retouch ${man ? 'him' : 'her'}. ${face}${figure}` +
    'From IMAGE 1 take only the setting: ';
  const anchored = renumbered.replace(LIKENESS_OF_FRAME(who), person);
  if (anchored === renumbered) throw new Error('avatar v5: frame identity line moved');
  return anchored;
}
