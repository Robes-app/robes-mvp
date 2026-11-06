import 'server-only';
import { createHash } from 'node:crypto';

// The rack half of a render-on-model key: the pieces in rack order, each with how it is worn, so
// a changed note re-renders once and an unchanged rack costs nothing. renderOnModel writes it;
// the look entity reads it back to say whether the picture is stale (plan 2026-11-03 §1.4).
// Her picture note (D21) is part of what the render shows; without one the hash is as it always
// was, so renders drawn before the note stay current.
export function rackHash(
  pieces: readonly { id: string }[],
  notes: Readonly<Record<string, unknown>>,
  pictureNote?: string | null,
): string {
  const note = pictureNote?.trim();
  return createHash('sha256')
    .update(pieces.map((p) => `${p.id}~${notes[p.id] ?? ''}`).join(','))
    .update(note ? `\u0000note:${note}` : '')
    .digest('base64url')
    .slice(0, 22);
}
