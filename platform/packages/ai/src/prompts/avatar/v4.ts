import { fenceUserText } from '../../fence';
import {
  type RenderPiece,
  buildFrameRenderPrompt as v3Frame,
  buildRenderPrompt as v3Render,
} from './v3';

// v4 (Felix rebuild D21, 6 Nov): her picture note. The AdjustSheet's words ("sleeves rolled up")
// stay with the look and ride every redraw of Robes' picture — the render on her model, the frame
// re-dressed, a frame drawn fresh — as a styling instruction for the photograph only: how the
// listed pieces are worn, the pose and the light, never which pieces. Without a note every prompt
// is v3 byte for byte.
export {
  buildCellPrompt,
  buildTwinPrompt,
  CELL_FEATURE,
  describeCell,
  FRAME_FEATURE,
  MAX_PIECE_REFERENCES,
  RENDER_FEATURE,
  type RenderPiece,
  TWIN_FEATURE,
  twinDescriptor,
  twinFigureLine,
} from './v3';
export const VERSION = 4;

// The note's cap in the prompt; the column holds as much (PICTURE_NOTE_MAX).
const NOTE_MAX = 280;
const CLOSE = 'Generate the single photograph now.';

export function pictureNoteLine(note: string | null | undefined): string {
  const said = String(note ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!said) return '';
  return `HER NOTE ON THIS PHOTOGRAPH, in her words — how the picture is styled, posed and lit, never what is worn: ${fenceUserText(said, NOTE_MAX)} Follow it only for how the listed pieces are worn and how the photograph is taken. It never adds, removes or substitutes a piece: every listed piece stays, and nothing unlisted appears.`;
}

// Any image prompt with her note before its closing line (or at its end when it has none).
export function withPictureNote(prompt: string, note: string | null | undefined): string {
  const line = pictureNoteLine(note);
  if (!line) return prompt;
  const at = prompt.lastIndexOf(CLOSE);
  return at === -1 ? `${prompt} ${line}` : `${prompt.slice(0, at)}${line} ${prompt.slice(at)}`;
}

export function buildRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  twin?: { face: boolean; figure: string },
  note?: string | null,
): string {
  return withPictureNote(v3Render(gender, pieces, twin), note);
}

export function buildFrameRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  note?: string | null,
): string {
  return withPictureNote(v3Frame(gender, pieces), note);
}
