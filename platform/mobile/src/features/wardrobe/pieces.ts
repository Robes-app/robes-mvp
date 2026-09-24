import { queryKeys, useApiClient, useUndoableMutation } from '@robes/api-client/react';
import type { Piece, PiecePage } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

const PAGE = 40;
// While Robes is reading new photos the list refreshes until every piece has filled in.
export const READING_REFRESH_MS = 2000;

export const piecesKey = [...queryKeys.route('wardrobe.list'), 'infinite'] as const;

export function usePieces() {
  const api = useApiClient();
  const query = useInfiniteQuery({
    queryKey: piecesKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.call('wardrobe.list', {
        input: { limit: PAGE, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      }),
    getNextPageParam: (last: PiecePage) => last.nextCursor ?? undefined,
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.items.some((i) => i.status === 'reading'))
        ? READING_REFRESH_MS
        : false,
  });
  const pieces: Piece[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...query, pieces };
}

function withoutPiece(old: unknown, id: string): unknown {
  const data = old as InfiniteData<PiecePage> | undefined;
  if (!data?.pages) return old;
  return {
    ...data,
    pages: data.pages.map((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) })),
  };
}

// Soft delete that disappears at once and offers Undo for ≥6 s (UX-13/15).
export function useDeletePiece(onDeleted?: () => void) {
  const api = useApiClient();
  const toast = useToast();
  return useUndoableMutation('wardrobe.delete', {
    optimistic: ({ params }) => [
      { queryKey: piecesKey, update: (old) => withoutPiece(old, params.id) },
    ],
    invalidate: () => [queryKeys.route('wardrobe.list'), queryKeys.route('wardrobe.get')],
    onSuccess: () => onDeleted?.(),
    onError: () => toast.show({ message: copy.addFailed }),
    undo: {
      onAvailable: (handle) =>
        toast.show({
          message: copy.deleted,
          action: { label: copy.undo, onPress: () => void handle.undo() },
        }),
      compensate: ({ params }) => api.call('wardrobe.restore', { params }),
    },
  });
}
