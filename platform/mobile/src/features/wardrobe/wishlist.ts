import { queryKeys, useApiClient, useUndoableMutation } from '@robes/api-client/react';
import type { Wish, WishPage } from '@robes/contracts';
import { wardrobe as copy, errors } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

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

// A wish on a look's rack is a proposal that names its wish (wishlistItemId): its photograph,
// brand and page come from the wish itself (Annie, 15 Nov: a wish added to a draft showed no
// thumbnail and couldn't be opened).
export function useWishOf(): (id: string | null | undefined) => Wish | undefined {
  const { wishes } = useWishes();
  const byId = useMemo(() => new Map(wishes.map((w) => [w.id, w])), [wishes]);
  return useCallback((id) => (id ? byId.get(id) : undefined), [byId]);
}

function withoutWish(old: unknown, id: string): unknown {
  const data = old as InfiniteData<WishPage> | undefined;
  if (!data?.pages) return old;
  return {
    ...data,
    pages: data.pages.map((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) })),
  };
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
