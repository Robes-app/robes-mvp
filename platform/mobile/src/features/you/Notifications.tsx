import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Me, NotificationPrefs } from '@robes/contracts';
import { you } from '@robes/copy';
import { ErrorText } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { LoadingScreen } from '@/components/LoadingScreen';
import { errorMessage } from '@/lib/errors';
import { SettingsGroup, SettingsToggleRow } from './Settings';

const copy = you.notifications;
const KEYS = ['looksReady', 'morningCue', 'nudges', 'receipts'] as const satisfies ReadonlyArray<
  keyof NotificationPrefs
>;

export function Notifications() {
  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-12">
      <SettingsGroup>
        <NotificationRows />
      </SettingsGroup>
    </ScrollView>
  );
}

// The rows of the Account tab's Notifications card (legacy .sp-tog rows).
export function NotificationRows() {
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
