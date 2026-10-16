import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { wardrobe as copy } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { piecesKey } from './pieces';
import { wishesKey } from './wishlist';

export const JOB_POLL_MS = 1000;

export function useInbox() {
  return useApi('inbox.list');
}

// Filing changes the Inbox, Today's count and the list it lands in.
export function useDecideInbox() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('inbox.decide', {
    onSuccess: (result) => {
      toast.show({
        message: result.status === 'dismissed' ? copy.inbox.skipped : copy.inbox.filed,
      });
      for (const key of [
        queryKeys.route('inbox.list'),
        queryKeys.route('today.get'),
        piecesKey,
        wishesKey,
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
