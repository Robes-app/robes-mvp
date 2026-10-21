'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Me, NotificationPrefs } from '@robes/contracts';
import { errors, you } from '@robes/copy';
import { ErrorText, Skeleton, Switch, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';

const KEYS = ['looksReady', 'morningCue', 'nudges', 'receipts'] as const satisfies ReadonlyArray<
  keyof NotificationPrefs
>;

// Optimistic toggles: the switch flips at once and rolls back if the save fails (UX-13).
export function NotificationsForm() {
  const queryClient = useQueryClient();
  const key = queryKeys.call('me.get');
  const me = useApi('me.get');
  const update = useApiMutation('me.update', {
    onSuccess: (data) => queryClient.setQueryData(key, data),
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (!me.data) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        {KEYS.map((k) => (
          <Skeleton key={k} className="h-11" />
        ))}
      </div>
    );
  }
  const prefs = me.data.notifications;

  function toggle(name: (typeof KEYS)[number], on: boolean) {
    queryClient.setQueryData<Me>(key, (old) =>
      old ? { ...old, notifications: { ...old.notifications, [name]: on } } : old,
    );
    update.mutate({ input: { notifications: { [name]: on } } });
  }

  return (
    <div className="flex flex-col gap-4">
      {KEYS.map((name) => (
        <Switch
          key={name}
          label={you.notifications[name]}
          checked={prefs[name]}
          onChange={(on) => toggle(name, on)}
        />
      ))}
      <Text role="status" size="small" tone="muted" className="min-h-5">
        {update.isPending ? you.account.saving : update.isSuccess ? you.account.saved : ''}
      </Text>
      {update.isError ? <ErrorText>{errors.internal}</ErrorText> : null}
    </div>
  );
}
