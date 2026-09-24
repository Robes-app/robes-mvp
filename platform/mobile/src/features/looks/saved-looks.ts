import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { LookPage } from '@robes/contracts';
import { looks as copy, errors, ui } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';

const LIMIT = 30;

export function useSavedLooks() {
  return useApi('looks.list', { input: { limit: LIMIT } });
}

// Her local calendar date: a wear belongs to the day she wore it, not UTC's.
export function localDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function useWearToday() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('looks.wear', {
    onSuccess: async (wear) => {
      toast.show({
        message: copy.look.woreToday,
        action: {
          label: ui.undo,
          onPress: () =>
            void api
              .call('looks.unwear', { params: { id: wear.lookId, date: wear.wornOn } })
              .then(() =>
                queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.get') }),
              ),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.get') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') }),
      ]);
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}

function withoutLook(old: unknown, id: string): unknown {
  const page = old as LookPage | undefined;
  return page?.items ? { ...page, items: page.items.filter((l) => l.id !== id) } : old;
}

export function useRemoveLook() {
  const api = useApiClient();
  const toast = useToast();
  return useUndoableMutation('looks.delete', {
    optimistic: ({ params }) => [
      { queryKey: queryKeys.route('looks.list'), update: (old) => withoutLook(old, params.id) },
    ],
    onError: () => toast.show({ message: errors.internal }),
    undo: {
      onAvailable: (handle) =>
        toast.show({
          message: copy.look.removed,
          action: { label: ui.undo, onPress: () => void handle.undo() },
        }),
      compensate: ({ params }) => api.call('looks.restore', { params }),
    },
  });
}
