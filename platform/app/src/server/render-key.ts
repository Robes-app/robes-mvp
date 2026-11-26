import 'server-only';
import { createHash } from 'node:crypto';

// A piece on the look that is not filed in her wardrobe: one found in her photograph, or one the
// prompt added (a wish, a new piece to shop). Its styling note is keyed by its rack key.
export interface RackProposal {
  key: string;
  name: string;
  brand?: string | null;
}

// The rack half of a render-on-model key: the pieces in rack order, each with how it is worn, so
// a changed note re-renders once and an unchanged rack costs nothing. renderOnModel writes it;
// the look entity reads it back to say whether the picture is stale (plan 2026-11-03 §1.4).
// Her picture note (D21) is part of what the render shows; without one the hash is as it always
// was, so renders drawn before the note stay current. The look's proposals are drawn too (D1,
// Annie 26 Nov: every piece on the look, found or added, filed or not), so adding or taking one
// off makes the picture stale; a look with none hashes as it always did.
export function rackHash(
  pieces: readonly { id: string }[],
  notes: Readonly<Record<string, unknown>>,
  pictureNote?: string | null,
  proposals: readonly RackProposal[] = [],
): string {
  const note = pictureNote?.trim();
  const found = proposals.map((p) => `${p.key}|${p.name}|${p.brand ?? ''}~${notes[p.key] ?? ''}`);
  return createHash('sha256')
    .update(pieces.map((p) => `${p.id}~${notes[p.id] ?? ''}`).join(','))
    .update(found.length ? `\u0000proposals:${found.join(',')}` : '')
    .update(note ? `\u0000note:${note}` : '')
    .digest('base64url')
    .slice(0, 22);
}
