import type { RenderPiece } from './v3';
import { buildRenderPrompt as v4Render } from './v4';
import { type FrameAnchor, buildFrameRenderPrompt as v5Frame } from './v5';

// v6 (testing 19 Nov: "can you add a warm coat"). A coat on the rack was a plain line at the
// foot of the list ("- the Oversized wool-blend coat."), under a hoodie with its own photograph
// and "reproduce this exact garment faithfully"; re-dressing a photograph of the hoodie, the
// model kept the hoodie and left the coat out. v6 names each outer layer as the outer layer,
// worn over the tops, and as one that must be seen. Without outerwear every prompt is v5 (and
// v4 for her model) byte for byte.
export * from './v5';
export const VERSION = 6;

const UNDER = new Set(['Tops', 'Dresses']);

export function layersLine(pieces: readonly RenderPiece[]): string {
  const outer = pieces.filter((p) => p.category === 'Outerwear');
  if (outer.length === 0) return '';
  const under = pieces.filter((p) => UNDER.has(p.category ?? ''));
  const name = (p: RenderPiece) => `the ${p.name.slice(0, 120)}`;
  const coats = outer.map(name).join(' and ');
  const over = under.length ? `, worn over ${under.map(name).join(' and ')}` : '';
  const is = outer.length > 1 ? 'are the outer layers' : 'is the outer layer';
  return `LAYERS: ${coats} ${is}${over} — clearly visible in the photograph, never left out.`;
}

// The line goes straight after the garment list, so it reads as part of the outfit.
function withLayers(prompt: string, pieces: readonly RenderPiece[]): string {
  const line = layersLine(pieces);
  if (!line) return prompt;
  const last = prompt.lastIndexOf('\n- ');
  const end = last === -1 ? -1 : prompt.indexOf('\n', last + 1);
  if (end === -1) throw new Error('avatar v6: garment list moved');
  return `${prompt.slice(0, end)}\n${line}${prompt.slice(end)}`;
}

export function buildFrameRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  note?: string | null,
  anchor?: FrameAnchor,
): string {
  return withLayers(v5Frame(gender, pieces, note, anchor), pieces);
}

export function buildRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  twin?: { face: boolean; figure: string },
  note?: string | null,
): string {
  return withLayers(v4Render(gender, pieces, twin, note), pieces);
}
