import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Me, NotificationPrefs } from '@robes/contracts';
import { you } from '@robes/copy';
import { ErrorText } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { getPermissionsAsync } from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, View } from 'react-native';
import { LoadingScreen } from '@/components/LoadingScreen';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { askForPushNow } from '@/lib/push';
import { SettingsGroup, SettingsRow, SettingsToggleRow } from './Settings';

const copy = you.notifications;
const KEYS = ['looksReady', 'morningCue', 'nudges', 'receipts'] as const satisfies ReadonlyArray<
  keyof NotificationPrefs
>;

type Permission = 'granted' | 'denied' | 'undetermined' | null;

// The phone's own notification permission, read again whenever she comes back to the app (from
// Settings, say).
function usePushPermission(): [Permission, () => void] {
  const [status, setStatus] = useState<Permission>(null);
  const read = useCallback(() => {
    getPermissionsAsync().then(
      (p) => setStatus(p.status as Permission),
      () => setStatus(null),
    );
  }, []);
  useEffect(() => {
    read();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') read();
    });
    return () => sub.remove();
  }, [read]);
  return [status, read];
}

export function Notifications() {
  const [permission, reread] = usePushPermission();
  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pt-6 pb-12">
      {/* Audit F8: the switches mean nothing while the phone says no, so its state leads. */}
      {permission === 'denied' ? (
        <SettingsGroup>
          <SettingsRow
            first
            label={copy.systemOff}
            sub={copy.systemOffSub}
            external
            onPress={() => void Linking.openSettings()}
            testID="push-system-off"
          />
        </SettingsGroup>
      ) : permission === 'undetermined' ? (
        <SettingsGroup>
          <SettingsRow
            first
            label={copy.systemAsk}
            sub={copy.systemAskSub}
            onPress={() => void askForPushNow(api).finally(reread)}
            testID="push-system-ask"
          />
        </SettingsGroup>
      ) : null}
      <SettingsGroup>
        <NotificationRows />
      </SettingsGroup>
    </ScrollView>
  );
}

// The rows of You › Notifications (legacy .sp-tog rows).
function NotificationRows() {
  const queryClient = useQueryClient();
  const meKey = queryKeys.call('me.get');
  const { data: me } = useApi('me.get');
  // Optimistic: the toggle flips at once and rolls back if the save fails.
  const update = useApiMutation('me.update', {
    onError: () => void queryClient.invalidateQueries({ queryKey: meKey }),
    onSuccess: (next) => queryClient.setQueryData(meKey, next),
  });
  if (!me) return <LoadingScreen />;

  async function toggle(key: keyof NotificationPrefs, value: boolean) {
    // A /me fetch still in flight would land after, and undo, the optimistic flip.
    await queryClient.cancelQueries({ queryKey: meKey });
    queryClient.setQueryData<Me>(meKey, (old) =>
      old ? { ...old, notifications: { ...old.notifications, [key]: value } } : old,
    );
    update.mutate({ input: { notifications: { [key]: value } } });
  }

  return (
    <>
      {KEYS.map((key, i) => (
        <SettingsToggleRow
          key={key}
          first={i === 0}
          label={copy[key]}
          value={me.notifications[key]}
          onChange={(v) => void toggle(key, v)}
        />
      ))}
      {update.isError ? (
        <View className="border-t border-hairline px-[18px] py-3">
          <ErrorText>{errorMessage(update.error)}</ErrorText>
        </View>
      ) : null}
    </>
  );
}
