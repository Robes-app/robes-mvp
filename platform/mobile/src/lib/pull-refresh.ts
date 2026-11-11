import { useCallback, useEffect, useRef, useState } from 'react';

// Pull to refresh that spins only for her pull. A screen that polls (Home while a draft dresses,
// the Lookbook while a frame draws) refetches in the background every few seconds; tied to
// `isRefetching`, each poll set the RefreshControl spinning, which on iOS shoves the content down
// and can leave it shifted, the top line tucked under the bar (Annie, 10 Nov).
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refetch()
      .catch(() => undefined)
      .finally(() => {
        if (live.current) setRefreshing(false);
      });
  }, [refetch]);
  return { refreshing, onRefresh };
}
