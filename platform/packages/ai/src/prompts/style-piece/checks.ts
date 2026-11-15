import type { ClosetPiece, StoredPiece } from './v3';

// What code can say about a look once it is normalised: counts and booleans only, so the answer
// is auditable on the ledger (`detail.checks`) and scored the same way by the eval set.
export interface LookChecks {
  // Shoes, and a dress or a top with a bottom.
  complete: boolean;
  // Wardrobe alone ('owned') lists nothing she would have to find.
  sources_obeyed: boolean;
  // Owned pieces whose name shares no word with the label of the piece the index points at.
  label_mismatch: number;
  owned: number;
  proposed: number;
}

const words = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2),
  );

function mismatched(name: string, label: string): boolean {
  const a = words(name);
  const b = words(label);
  if (a.size === 0 || b.size === 0) return false;
  for (const w of a) if (b.has(w)) return false;
  return true;
}

export function lookChecks(
  pieces: readonly StoredPiece[],
  closet: readonly ClosetPiece[],
  balance: string | null | undefined,
): LookChecks {
  const has = (category: StoredPiece['category']) => pieces.some((p) => p.category === category);
  const labels = new Map(closet.map((c) => [c.id, c.label]));
  const owned = pieces.filter((p) => p.pieceId);
  return {
    complete: has('Shoes') && (has('Dresses') || (has('Tops') && has('Bottoms'))),
    sources_obeyed: balance !== 'owned' || owned.length === pieces.length,
    label_mismatch: owned.filter((p) => mismatched(p.name, labels.get(p.pieceId ?? '') ?? ''))
      .length,
    owned: owned.length,
    proposed: pieces.length - owned.length,
  };
}
