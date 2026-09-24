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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Share } from 'react-native';

const LIMIT = 30;

export function useSavedLooks() {
  return useApi('looks.list', { input: { limit: LIMIT } });
}

// Her local calendar date: a wear belongs to the day she wore it, not UTC's.
export function localDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Today and the following days as local calendar dates, for "Wear on a day".
export function nextDays(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)),
  );
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

export function useRenameLook() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('looks.update', {
    onSuccess: async (look) => {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), look);
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}

export function useSaveAsNew(onSaved: (id: string) => void) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('looks.variant', {
    onSuccess: async (look) => {
      toast.show({ message: copy.look.savedAsNew });
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      onSaved(look.id);
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}

// The share token for a look lives in the query cache for the session, so "Stop sharing" knows it.
const shareKey = (lookId: string) => ['share', lookId] as const;

export function useShareToken(lookId: string): string | null {
  const { data } = useQuery({
    queryKey: shareKey(lookId),
    queryFn: () => null as string | null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  return data ?? null;
}

export function useShareLook() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('shares.create', {
    onSuccess: async (share, { input }) => {
      queryClient.setQueryData(shareKey(input.subjectId), share.token);
      await Share.share({ url: share.url, message: share.url });
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}

export function useStopSharing(lookId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useApiMutation('shares.revoke', {
    onSuccess: () => {
      queryClient.setQueryData(shareKey(lookId), null);
      toast.show({ message: copy.look.sharingStopped });
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}
