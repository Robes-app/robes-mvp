'use client';

import type { ApiClient } from '@robes/api-client';
import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import { DATED_ROUTES, type Me } from '@robes/contracts';
import { createTimeZoneSync, deviceTimeZone, type TimeZoneOutcome } from '@robes/core/timezone';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

// Sends the browser's zone when it differs from hers, keeps the profile it gets back and refetches
// every read worked out from her "today" (B6).
export function timeZoneSender(
  client: ApiClient,
  queryClient: QueryClient,
): (stored: string | undefined, device: string | null) => Promise<TimeZoneOutcome> {
  return createTimeZoneSync(async (timezone) => {
    const me = await client.call('me.update', { input: { timezone } });
    queryClient.setQueryData<Me>(queryKeys.call('me.get'), me);
    await Promise.all(
      DATED_ROUTES.map((key) => queryClient.invalidateQueries({ queryKey: queryKeys.route(key) })),
    );
  });
}

// Her "today" is read in her timezone, so it follows the browser's: on sign-in (her profile's
// first load) and each time the tab comes back. Signed-in surfaces only: AppShell and the
// onboarding flow. Native twin: mobile/src/lib/timezone.tsx.
export function useDeviceTimeZone(): void {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const stored = useApi('me.get').data?.timezone;
  const sync = useMemo(() => timeZoneSender(client, queryClient), [client, queryClient]);

  useEffect(() => {
    void sync(stored, deviceTimeZone());
  }, [sync, stored]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const me = queryClient.getQueryData<Me>(queryKeys.call('me.get'));
      void sync(me?.timezone, deviceTimeZone());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sync, queryClient]);
}
