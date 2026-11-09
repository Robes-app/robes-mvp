import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { InboxItemState } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { piecesKey } from './pieces';
import { wishesKey } from './wishlist';

export const JOB_POLL_MS = 1000;

// The Receipts' tabs (PRD rev 3 §7.5): the receipts with pieces in one state; `count` is always
// the pieces waiting.
export function useInbox(state: InboxItemState = 'inbox') {
  return useApi('inbox.list', { input: { state } });
}

// Filing changes the Inbox, Today's count and the list it lands in.
export function useDecideInbox() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('inbox.decide', {
    onSuccess: (_result, args) => {
      toast.show({
        message: args.input.action === 'dismiss' ? copy.receipts.discarded : copy.receipts.added,
      });
      for (const key of [
        queryKeys.route('inbox.list'),
        queryKeys.route('today.get'),
        queryKeys.route('wardrobe.summary'),
        piecesKey,
        wishesKey,
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
