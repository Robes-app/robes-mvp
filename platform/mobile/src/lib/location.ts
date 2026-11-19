import type { ApiClient } from '@robes/api-client';
import { queryKeys, useApi } from '@robes/api-client/react';
import { locationStep, parseSentAt } from '@robes/core/location';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { api } from './api';
import { useConsents } from './consents';
import { readPref, writePref } from './prefs';

// Native twin of app/src/lib/device-location.ts: the system prompt once, on her first signed-in
// launch; if she allowed it, a quiet read on later launches so the weather follows her.
// iOS and Android know whether they have asked ('undetermined' until then), so no flag of ours
// does: one kept in the keychain outlived a reinstall and the prompt never came (19 Nov). When it
// was last sent is per account, so a new account on the phone gets its city at once.
export const sentAtKey = (userId: string) => `robes.geo.at.${userId}`;

export type LocationOutcome = 'sent' | 'denied' | 'skipped' | 'failed';

async function readPosition(): Promise<{ lat: number; lon: number } | null> {
  // ~1 km is all the server keeps; a fix from the last half hour saves waking the radio.
  const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  return pos ? { lat: pos.coords.latitude, lon: pos.coords.longitude } : null;
}

export async function syncDeviceLocation(
  client: ApiClient,
  userId: string,
  now = Date.now(),
): Promise<LocationOutcome> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    // Declined (here or in Settings): the system won't show the prompt again; never nag her.
    if (current.status === 'denied') return 'denied';
    const step = locationStep({
      asked: current.status !== 'undetermined',
      allowed: current.status === 'granted',
      lastSentAt: parseSentAt(await readPref(sentAtKey(userId))),
      now,
    });
    if (step === 'none') return 'skipped';
    if (step === 'ask') {
      const answer = await Location.requestForegroundPermissionsAsync();
      if (answer.status !== 'granted') return 'denied';
    }
    const coords = await readPosition();
    if (!coords) return 'failed';
    await client.call('me.location', { input: coords });
    await writePref(sentAtKey(userId), String(now));
    return 'sent';
  } catch {
    // Location off, no fix, offline or rate-limited: try again next launch.
    return 'failed';
  }
}

// Mounted only inside the signed-in shell, beside PushSetup. It waits for her answer to the usage
// question: the system's location prompt never stands on top of it (P0, App Store review, F2).
// Home shows the weather at once, so straight after that answer is when the weather needs her
// place.
export function LocationSetup(): null {
  const queryClient = useQueryClient();
  const { consents } = useConsents();
  const userId = useApi('me.get').data?.id;
  const answered = consents !== undefined && consents.analytics !== null;
  useEffect(() => {
    if (!answered || !userId) return;
    void syncDeviceLocation(api, userId).then((outcome) => {
      if (outcome !== 'sent') return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.weather') });
    });
  }, [queryClient, answered, userId]);
  return null;
}
