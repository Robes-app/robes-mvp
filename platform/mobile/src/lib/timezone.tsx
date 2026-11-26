import type { ApiClient } from '@robes/api-client';
import { queryKeys, useApi } from '@robes/api-client/react';
import { DATED_ROUTES, type Me } from '@robes/contracts';
import { createTimeZoneSync, deviceTimeZone, type TimeZoneOutcome } from '@robes/core/timezone';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
import { authClient } from './auth-client';

// Sends the phone's zone when it differs from hers, keeps the profile it gets back and refetches
// every read worked out from her "today" (B6). Twin of timeZoneSender in
// app/src/components/shell/device-timezone.tsx.
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

// Her "today" is read in her timezone, so it follows the phone's: on sign-in (her profile's first
// load) and each time the app comes to the foreground. Mounted once at the root beside
// SessionGate, so onboarding's Today's outfit and Home agree on the day. Web twin:
// useDeviceTimeZone in app/src/components/shell/device-timezone.tsx.
export function TimeZoneSync({ client = api }: { client?: ApiClient }): null {
  const queryClient = useQueryClient();
  const signedIn = Boolean(authClient.useSession().data);
  const stored = useApi('me.get', undefined, { enabled: signedIn }).data?.timezone;
  const sync = useMemo(() => timeZoneSender(client, queryClient), [client, queryClient]);

  useEffect(() => {
    if (signedIn) void sync(stored, deviceTimeZone());
  }, [sync, signedIn, stored]);

  useEffect(() => {
    if (!signedIn) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const me = queryClient.getQueryData<Me>(queryKeys.call('me.get'));
      void sync(me?.timezone, deviceTimeZone());
    });
    return () => sub.remove();
  }, [sync, signedIn, queryClient]);

  return null;
}
