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

// A rack as rackHash reads it, each proposal with what it was found from.
export interface HashedRack {
  pieces: readonly { id: string }[];
  notes: Readonly<Record<string, unknown>>;
  pictureNote?: string | null;
  proposals: readonly (RackProposal & { capture?: unknown })[];
}

// Filing a found piece keeps her picture current (Annie, 26 Nov): the piece drawn from her
// photograph is the same piece, now hers or a wish. `drawn` is the rack hash her picture was drawn
// for. When `after`, with each filed row put back as the found row it was in `before`, hashes to
// it, the picture wears `after` too, and this returns the hash it now stands for. Anything else
// that changed alongside (a piece added or taken off, a note, a found row only removed) still asks
// for a redraw: null. A `filed` entry the two racks don't bear out is ignored.
export function filedRackHash(
  before: HashedRack,
  after: HashedRack,
  filed: readonly { from: string; to: string }[],
  drawn: string,
): string | null {
  const found = new Map(before.proposals.filter((p) => p.capture).map((p) => [p.key, p]));
  const had = new Set(before.pieces.map((p) => p.id));
  const plain = new Set(before.proposals.filter((p) => !p.capture).map((p) => p.key));
  const now = new Map(after.proposals.map((p) => [p.key, p]));
  const asPiece = new Map<string, RackProposal>();
  const asWish = new Map<string, RackProposal>();
  for (const { from, to } of filed) {
    const was = found.get(from);
    if (!was || now.get(from)?.capture) continue;
    if (!had.has(to) && after.pieces.some((p) => p.id === to)) asPiece.set(to, was);
    else if (now.has(to) && !now.get(to)?.capture && !plain.has(to)) asWish.set(to, was);
  }
  if (asPiece.size + asWish.size === 0) return null;
  const order = new Map(before.proposals.map((p, i) => [p.key, i]));
  const at = (p: RackProposal) => order.get(p.key) ?? before.proposals.length;
  const proposals = [
    ...after.proposals.map((p) => asWish.get(p.key) ?? p),
    ...asPiece.values(),
  ].sort((a, b) => at(a) - at(b));
  const notes: Record<string, unknown> = { ...after.notes };
  for (const was of [...asPiece.values(), ...asWish.values()]) {
    notes[was.key] = before.notes[was.key];
  }
  const unfiled = rackHash(
    after.pieces.filter((p) => !asPiece.has(p.id)),
    notes,
    after.pictureNote,
    proposals,
  );
  if (unfiled !== drawn) return null;
  return rackHash(after.pieces, after.notes, after.pictureNote, after.proposals);
}
