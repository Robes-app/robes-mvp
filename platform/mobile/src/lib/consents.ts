import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Consents } from '@robes/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

// Where a consent answer given on this device came from.
export const CONSENT_SOURCE = Platform.OS === 'android' ? 'android' : 'ios';

type Answers = Partial<Record<keyof Consents, boolean>>;

// Her consent answers on this device: the one module behind every screen that reads or gives one
// (You › Privacy, the usage-counts question, the twin consent). `give` shows her answer at once
// and saves it; a save that fails brings back what the server holds. With `wait`, nothing shows
// until the server has it: the twin consent uses that, so the camera never opens on a yes that
// was not saved. The web's counterpart is useAnalytics() in app/src/components/analytics-provider.tsx.
export function useConsents(): {
  consents: Consents | undefined;
  give: (answers: Answers, options?: { wait?: boolean }) => void;
  saving: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const key = queryKeys.call('me.consents.get');
  const { data } = useApi('me.consents.get');
  const update = useApiMutation('me.consents.update', {
    onError: () => void queryClient.invalidateQueries({ queryKey: key }),
    onSuccess: (next) => queryClient.setQueryData(key, next),
  });
  return {
    consents: data,
    give(answers, options) {
      if (!options?.wait) {
        void queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueryData<Consents>(key, (old) => (old ? { ...old, ...answers } : old));
      }
      update.mutate({ input: { source: CONSENT_SOURCE, consents: answers } });
    },
    saving: update.isPending,
    error: update.isError ? update.error : null,
  };
}
