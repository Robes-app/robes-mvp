import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Me, NotificationPrefs } from '@robes/contracts';
import { you } from '@robes/copy';
import { Text } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView } from 'react-native';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ToggleRow } from '@/components/ToggleRow';
import { errorMessage } from '@/lib/errors';

const copy = you.notifications;
const KEYS = ['looksReady', 'morningCue', 'nudges', 'receipts'] as const satisfies ReadonlyArray<
  keyof NotificationPrefs
>;

export function Notifications() {
  const queryClient = useQueryClient();
  const meKey = queryKeys.call('me.get');
  const { data: me } = useApi('me.get');
  // Optimistic: the toggle flips at once and rolls back if the save fails.
  const update = useApiMutation('me.update', {
    onError: () => void queryClient.invalidateQueries({ queryKey: meKey }),
    onSuccess: (next) => queryClient.setQueryData(meKey, next),
  });
  if (!me) return <LoadingScreen />;

  function toggle(key: keyof NotificationPrefs, value: boolean) {
    queryClient.setQueryData<Me>(meKey, (old) =>
      old ? { ...old, notifications: { ...old.notifications, [key]: value } } : old,
    );
    update.mutate({ input: { notifications: { [key]: value } } });
  }

  return (
    <ScrollView contentContainerClassName="px-6 pb-12">
      {KEYS.map((key) => (
        <ToggleRow
          key={key}
          label={copy[key]}
          value={me.notifications[key]}
          onChange={(v) => toggle(key, v)}
        />
      ))}
      {update.isError ? <Text tone="danger">{errorMessage(update.error)}</Text> : null}
    </ScrollView>
  );
}
