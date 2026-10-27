import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Consents } from '@robes/contracts';
import { consent as copy } from '@robes/copy';
import { ErrorText } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Platform, ScrollView } from 'react-native';
import { LoadingScreen } from '@/components/LoadingScreen';
import { errorMessage } from '@/lib/errors';
import { SettingsGroup, SettingsToggleRow } from './Settings';

const SOURCE = Platform.OS === 'android' ? 'android' : 'ios';

export function Privacy() {
  const queryClient = useQueryClient();
  const key = queryKeys.call('me.consents.get');
  const { data: consents } = useApi('me.consents.get');
  const update = useApiMutation('me.consents.update', {
    onError: () => void queryClient.invalidateQueries({ queryKey: key }),
    onSuccess: (next) => queryClient.setQueryData(key, next),
  });
  if (!consents) return <LoadingScreen />;

  async function set(answers: Partial<Record<keyof Consents, boolean>>) {
    await queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<Consents>(key, (old) => (old ? { ...old, ...answers } : old));
    update.mutate({ input: { source: SOURCE, consents: answers } });
  }

  return (
    <ScrollView contentContainerClassName="gap-3 px-6 pt-6 pb-12">
      <SettingsGroup>
        <SettingsToggleRow
          first
          label={copy.analyticsLabel}
          sub={copy.analyticsHint}
          value={consents.analytics === true}
          // Recordings need usage counts, so turning counts off withdraws both.
          onChange={(v) => void set(v ? { analytics: true } : { analytics: false, replay: false })}
        />
        <SettingsToggleRow
          label={copy.replayLabel}
          sub={copy.replayHint}
          value={consents.replay === true}
          disabled={consents.analytics !== true}
          onChange={(v) => void set({ replay: v })}
        />
      </SettingsGroup>
      {update.isError ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}
    </ScrollView>
  );
}
