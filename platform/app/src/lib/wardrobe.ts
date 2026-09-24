import type { Piece, PiecePage } from '@robes/contracts';

interface InfinitePages {
  pages: PiecePage[];
  pageParams: unknown[];
}

function isInfinite(value: unknown): value is InfinitePages {
  return typeof value === 'object' && value !== null && 'pages' in value;
}

function isPage(value: unknown): value is PiecePage {
  return typeof value === 'object' && value !== null && 'items' in value;
}

// Optimistic removal across every cached wardrobe list, paged or plain.
export function withoutPiece(id: string) {
  return (old: unknown): unknown => {
    const drop = (page: PiecePage): PiecePage => ({
      ...page,
      items: page.items.filter((p) => p.id !== id),
    });
    if (isInfinite(old)) return { ...old, pages: old.pages.map(drop) };
    if (isPage(old)) return drop(old);
    return old;
  };
}

export function anyReading(pages: readonly PiecePage[] | undefined): boolean {
  return (pages ?? []).some((p) => p.items.some((i) => i.status === 'reading'));
}

export function pieceIsReading(piece: Piece | undefined): boolean {
  return piece?.status === 'reading';
}
