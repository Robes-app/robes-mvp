'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Me, NotificationPrefs } from '@robes/contracts';
import { errors, you } from '@robes/copy';
import { ErrorText, Skeleton } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { SettingsToggleRow, settingsRowClass } from '@/components/settings/settings-chrome';

const KEYS = ['looksReady', 'morningCue', 'nudges', 'receipts'] as const satisfies ReadonlyArray<
  keyof NotificationPrefs
>;

// Rows of the Account tab's Notifications card (legacy .sp-tog). Optimistic: the switch flips at
// once and rolls back if the save fails (UX-13).
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
      <div aria-busy>
        {KEYS.map((k) => (
          <div key={k} className={settingsRowClass}>
            <Skeleton className="h-6 w-full" />
          </div>
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
    <>
      {KEYS.map((name) => (
        <SettingsToggleRow
          key={name}
          label={you.notifications[name]}
          checked={prefs[name]}
          onChange={(on) => toggle(name, on)}
        />
      ))}
      <p role="status" className="sr-only">
        {update.isPending ? you.account.saving : update.isSuccess ? you.account.saved : ''}
      </p>
      {update.isError ? (
        <div className={settingsRowClass}>
          <ErrorText>{errors.internal}</ErrorText>
        </div>
      ) : null}
    </>
  );
}
