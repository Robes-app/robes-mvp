import {
  queryKeys,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { ListPiecesInput, Piece, PiecePage } from '@robes/contracts';
import { wardrobe as copy, errors } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type PhotoSource, pickOne } from '@/features/home/file-photo';
import { uploadPhoto } from './add-pieces';

const PAGE = 40;
// While Robes is reading new photos the list refreshes until every piece has filled in.
export const READING_REFRESH_MS = 2000;

export const piecesKey = [...queryKeys.route('wardrobe.list'), 'infinite'] as const;

export type PieceFilters = Pick<ListPiecesInput, 'category' | 'seasonBand'>;

export function usePieces(filters: PieceFilters = {}) {
  const api = useApiClient();
  const query = useInfiniteQuery({
    queryKey: [...piecesKey, filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.call('wardrobe.list', {
        input: { limit: PAGE, ...filters, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      }),
    getNextPageParam: (last: PiecePage) => last.nextCursor ?? undefined,
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.items.some((i) => i.status === 'reading'))
        ? READING_REFRESH_MS
        : false,
  });
  const pieces: Piece[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...query, pieces, total: query.data?.pages[0]?.total ?? null };
}

function withoutPiece(old: unknown, id: string): unknown {
  const data = old as InfiniteData<PiecePage> | undefined;
  if (!data?.pages) return old;
  return {
    ...data,
    pages: data.pages.map((p) => {
      const items = p.items.filter((i) => i.id !== id);
      const removed = data.pages.some((q) => q.items.some((i) => i.id === id));
      return { ...p, items, total: removed ? Math.max(0, p.total - 1) : p.total };
    }),
  };
}

function withPiece(old: unknown, id: string, patch: Partial<Piece>): unknown {
  const data = old as InfiniteData<PiecePage> | undefined;
  if (!data?.pages) return old;
  return {
    ...data,
    pages: data.pages.map((p) => ({
      ...p,
      items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  };
}

// The star: fills at once; the server picks the Hero Rack place (409 when all ten are taken).
export function useStarPiece() {
  const toast = useToast();
  const queryClient = useQueryClient();
  // The grid and the piece page share this star, so both caches settle (the web twin is
  // app/src/components/wardrobe/use-star-piece.ts).
  const settle = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.get') });
  };
  const star = useApiMutation('wardrobe.update', {
    onSuccess: (piece) => {
      toast.show({ message: piece.heroPosition ? copy.card.starred : copy.card.unstarred });
      settle();
    },
    onError: (err) => {
      toast.show({ message: err.code === 'conflict' ? copy.card.heroFull : errors.internal });
      settle();
    },
  });
  return (piece: Piece) => {
    const on = piece.heroPosition === null;
    queryClient.setQueriesData({ queryKey: piecesKey }, (old: unknown) =>
      withPiece(old, piece.id, { heroPosition: on ? 10 : null }),
    );
    queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id: piece.id } }), {
      ...piece,
      heroPosition: on ? 10 : null,
    });
    star.mutate({ params: { id: piece.id }, input: { hero: on } });
  };
}

// Change photo (legacy __rbPiecePhotoPick): the same upload door as the look's photograph, then
// `wardrobe.photo` puts it on the piece. What she picked shows until the renditions land.
// Web twin: app/src/components/wardrobe/use-piece-photo.ts.
export function usePiecePhoto(id: string) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const attach = useApiMutation('wardrobe.photo', {
    onSuccess: (piece) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id } }), piece);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    },
    onError: () => {
      setPreview(null);
      toast.show({ message: errors.internal });
    },
  });
  const take = async (from: PhotoSource) => {
    const picked = await pickOne(from);
    if (!picked || picked === 'denied') return;
    setUploading(true);
    try {
      const assetId = await uploadPhoto(api, picked);
      setPreview(picked.uri);
      attach.mutate({ params: { id }, input: { assetId } });
    } catch {
      toast.show({ message: errors.internal });
    } finally {
      setUploading(false);
    }
  };
  return { take, preview, busy: uploading || attach.isPending };
}

// Soft delete that disappears at once and offers Undo for ≥6 s (UX-13/15).
export function useDeletePiece(onDeleted?: () => void) {
  const api = useApiClient();
  const toast = useToast();
  return useUndoableMutation('wardrobe.delete', {
    optimistic: ({ params }) => [
      { queryKey: piecesKey, update: (old) => withoutPiece(old, params.id) },
    ],
    invalidate: () => [
      queryKeys.route('wardrobe.list'),
      queryKeys.route('wardrobe.get'),
      queryKeys.route('wardrobe.summary'),
    ],
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
