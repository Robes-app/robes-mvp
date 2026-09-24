import {
  queryKeys,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { WishPage } from '@robes/contracts';
import { wardrobe as copy, errors } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

const PAGE = 60;
export const wishesKey = [...queryKeys.route('wishlist.list'), 'infinite'] as const;

export function useWishes() {
  const api = useApiClient();
  const query = useInfiniteQuery({
    queryKey: wishesKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.call('wishlist.list', {
        input: { limit: PAGE, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      }),
    getNextPageParam: (last: WishPage) => last.nextCursor ?? undefined,
  });
  return { ...query, wishes: query.data?.pages.flatMap((p) => p.items) ?? [] };
}

function withoutWish(old: unknown, id: string): unknown {
  const data = old as InfiniteData<WishPage> | undefined;
  if (!data?.pages) return old;
  return {
    ...data,
    pages: data.pages.map((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) })),
  };
}

export function useAddWish() {
  const queryClient = useQueryClient();
  return useApiMutation('wishlist.create', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') }),
  });
}

// "I bought this": the wish becomes a piece in her wardrobe.
export function usePromoteWish() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('wishlist.promote', {
    onSuccess: async (piece) => {
      toast.show({ message: copy.wishlist.boughtToast(piece.label) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
      ]);
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}

export function useRemoveWish() {
  const api = useApiClient();
  const toast = useToast();
  return useUndoableMutation('wishlist.delete', {
    optimistic: ({ params }) => [
      { queryKey: wishesKey, update: (old) => withoutWish(old, params.id) },
    ],
    invalidate: () => [queryKeys.route('wishlist.list')],
    onError: () => toast.show({ message: errors.internal }),
    undo: {
      onAvailable: (handle) =>
        toast.show({
          message: copy.wishlist.removed,
          action: { label: copy.undo, onPress: () => void handle.undo() },
        }),
      compensate: ({ params }) => api.call('wishlist.restore', { params }),
    },
  });
}
