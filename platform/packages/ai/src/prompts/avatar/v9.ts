import * as v8 from './v8';

// v9 (a tester's look, 25 Nov): she asked for her shirt untucked, the rack said "untucked", and
// every piece she added redrew it tucked in again. The shirt's photograph is her wearing it tucked
// into trousers, and the line told the model to reproduce that photograph faithfully, silhouette
// and all, with "Worn: untucked." buried mid-line under its shape and detail. v9 moves how a piece
// is worn to the end of its garment line and says it overrides how the photograph shows it worn.
// A line with no styling note is v8's to the letter.
export * from './v8';
export const VERSION = 9;

export type RenderPiece = v8.RenderPiece;

const WORN_MAX = 120;

// v2's cleaning of a styling note, so the note found on the line is the one v2 wrote there.
const clean = (s: string | null | undefined) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, WORN_MAX);

export function wornLine(worn: string): string {
  return ` How it is worn in this look: ${worn}. This overrides how it is worn in its photograph: whatever that photograph shows (tucked in or left out, buttoned or open, sleeves rolled or down), draw it worn this way.`;
}

// Each piece's "Worn: …." taken from the middle of its garment line and put last, as the final word.
export function wornWins(prompt: string, pieces: readonly RenderPiece[]): string {
  const lines = prompt.split('\n');
  const at = lines.flatMap((l, i) => (l.startsWith('- ') ? [i] : [])).slice(0, pieces.length);
  if (at.length !== pieces.length) throw new Error('avatar v9: the garment list moved');
  pieces.forEach((p, k) => {
    const worn = clean(p.styled);
    if (!worn) return;
    const i = at[k] as number;
    const line = lines[i] as string;
    const said = ` Worn: ${worn}.`;
    const from = line.indexOf(said);
    if (from < 0) throw new Error('avatar v9: a styling note is missing from its garment line');
    lines[i] = line.slice(0, from) + line.slice(from + said.length) + wornLine(worn);
  });
  return lines.join('\n');
}

export function buildFrameRenderPrompt(
  ...args: Parameters<typeof v8.buildFrameRenderPrompt>
): string {
  return wornWins(v8.buildFrameRenderPrompt(...args), args[1]);
}

export function buildRenderPrompt(...args: Parameters<typeof v8.buildRenderPrompt>): string {
  return wornWins(v8.buildRenderPrompt(...args), args[1]);
}
