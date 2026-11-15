'use client';

import { useApi } from '@robes/api-client/react';
import type { Wish } from '@robes/contracts';
import { useCallback, useMemo } from 'react';

// A wish on a look's rack is a proposal that names its wish (wishlistItemId): its photograph and
// page come from the wish itself (Annie, 15 Nov). Native twin: useWishOf in features/wardrobe/wishlist.ts.
export function useWishOf(): (id: string | null | undefined) => Wish | undefined {
  const list = useApi('wishlist.list', { input: { limit: 100 } });
  const byId = useMemo(() => new Map((list.data?.items ?? []).map((w) => [w.id, w])), [list.data]);
  return useCallback((id) => (id ? byId.get(id) : undefined), [byId]);
}
