import { queryKeys } from '@robes/api-client/react';
import type { Piece, PiecePage } from '@robes/contracts';
import type { QueryClient } from '@tanstack/react-query';

// A piece filed or changed: the grid and its counts (the summary) both move, so the shell's
// consent ask and the category tabs see the new piece at once.
export async function invalidateWardrobe(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
    queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') }),
  ]);
}

interface ListPage {
  items: { id: string }[];
  total?: number;
}

interface InfinitePages {
  pages: ListPage[];
  pageParams: unknown[];
}

function isInfinite(value: unknown): value is InfinitePages {
  return typeof value === 'object' && value !== null && 'pages' in value;
}

function isPage(value: unknown): value is ListPage {
  return typeof value === 'object' && value !== null && 'items' in value;
}

// Optimistic removal across every cached list (pieces, wishes), paged or plain.
export function withoutId(id: string) {
  return (old: unknown): unknown => {
    const drop = (page: ListPage): ListPage => {
      const items = page.items.filter((p) => p.id !== id);
      if (typeof page.total !== 'number') return { ...page, items };
      // The count row follows the removal at once (the server's total is per query, every page).
      const removed = (old as InfinitePages).pages
        ? (old as InfinitePages).pages.some((p) => p.items.some((i) => i.id === id))
        : items.length !== page.items.length;
      return { ...page, items, total: removed ? Math.max(0, page.total - 1) : page.total };
    };
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

// Optimistic edit of one piece across every cached list (the star).
export function withPatch(id: string, patch: Partial<Piece>) {
  return (old: unknown): unknown => {
    const edit = (page: ListPage): ListPage => ({
      ...page,
      items: page.items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
    if (isInfinite(old)) return { ...old, pages: old.pages.map(edit) };
    if (isPage(old)) return edit(old);
    return old;
  };
}
