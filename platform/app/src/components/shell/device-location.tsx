'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { syncDeviceLocation } from '@/lib/device-location';

// Once per tab, however often the shell remounts (and once under StrictMode's double effect).
let started = false;

async function permissionState(): Promise<PermissionState | null> {
  if (!navigator.permissions?.query) return null;
  return (await navigator.permissions.query({ name: 'geolocation' })).state;
}

// Signed-in shell only (AppShell): the weather follows her device once she allows it. No copy of
// our own; the browser's prompt is the whole ask. Native twin: mobile/src/lib/location.ts.
export function useDeviceLocation(): void {
  const client = useApiClient();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (started) return;
    started = true;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    void syncDeviceLocation({
      storage,
      geolocation: navigator.geolocation,
      now: Date.now(),
      permission: permissionState,
      send: (input) => client.call('me.location', { input }),
    }).then((outcome) => {
      if (outcome !== 'sent') return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.weather') });
    });
  }, [client, queryClient]);
}
