import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { Plan } from '@robes/contracts';
import { plan as copy, errors, ui } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';

export const PLAN_DAYS = 30;

// The server picks "today" in her timezone and returns every day, empty ones included.
export function usePlan() {
  return useApi('plan.get', { input: { days: PLAN_DAYS } });
}

// "Thu 1 Oct" for a calendar date; dates are calendar text, so format them in UTC.
export function dayLabel(date: string, today?: string): string {
  if (date === today) return copy.today;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function withoutEntry(old: unknown, id: string): unknown {
  const plan = old as Plan | undefined;
  if (!plan?.days) return old;
  return {
    ...plan,
    days: plan.days.map((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })),
  };
}

export function useUnpin() {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useUndoableMutation('plan.unpin', {
    optimistic: ({ params }) => [
      { queryKey: queryKeys.route('plan.get'), update: (old) => withoutEntry(old, params.id) },
    ],
    onError: () => toast.show({ message: errors.internal }),
    undo: {
      onAvailable: (handle) =>
        toast.show({
          message: copy.unpinned,
          action: { label: ui.undo, onPress: () => void handle.undo() },
        }),
      compensate: async ({ params }) => {
        await api.call('plan.restore', { params });
        await queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      },
    },
  });
}

export function useUpdateEntry() {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useApiMutation('plan.update', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') }),
    onError: () => toast.show({ message: errors.internal }),
  });
}

export function usePinLook() {
  const queryClient = useQueryClient();
  return useApiMutation('plan.pin', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') }),
  });
}
