import type { ApiClient } from '@robes/api-client';
import { queryKeys } from '@robes/api-client/react';
import { locationStep, parseSentAt } from '@robes/core/location';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { api } from './api';
import { readPref, writePref } from './prefs';

// Native twin of app/src/lib/device-location.ts: the system prompt once, on her first signed-in
// launch; if she allowed it, a quiet read on later launches so the weather follows her.
export const ASKED_KEY = 'robes.geo.asked';
export const SENT_AT_KEY = 'robes.geo.at';

export type LocationOutcome = 'sent' | 'denied' | 'skipped' | 'failed';

async function readPosition(): Promise<{ lat: number; lon: number } | null> {
  // ~1 km is all the server keeps; a fix from the last half hour saves waking the radio.
  const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  return pos ? { lat: pos.coords.latitude, lon: pos.coords.longitude } : null;
}

export async function syncDeviceLocation(
  client: ApiClient,
  now = Date.now(),
): Promise<LocationOutcome> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    const step = locationStep({
      asked: (await readPref(ASKED_KEY)) === '1',
      allowed: current.status === 'granted',
      lastSentAt: parseSentAt(await readPref(SENT_AT_KEY)),
      now,
    });
    if (step === 'none') return 'skipped';
    if (step === 'ask') {
      await writePref(ASKED_KEY, '1');
      // Declined before (in Settings): the system won't show the prompt; never nag her there.
      if (current.status !== 'undetermined') return 'denied';
      const answer = await Location.requestForegroundPermissionsAsync();
      if (answer.status !== 'granted') return 'denied';
    }
    const coords = await readPosition();
    if (!coords) return 'failed';
    await client.call('me.location', { input: coords });
    await writePref(SENT_AT_KEY, String(now));
    return 'sent';
  } catch {
    // Location off, no fix, offline or rate-limited: try again next launch.
    return 'failed';
  }
}

// Mounted only inside the signed-in shell, beside PushSetup.
export function LocationSetup(): null {
  const queryClient = useQueryClient();
  useEffect(() => {
    void syncDeviceLocation(api).then((outcome) => {
      if (outcome !== 'sent') return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.weather') });
    });
  }, [queryClient]);
  return null;
}
