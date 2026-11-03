import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { Plan } from '@robes/contracts';
import { plan as copy, errors, ui } from '@robes/copy';
import { weekdayDayMonth } from '@robes/core/calendar';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';

export const PLAN_DAYS = 30;

// The server picks "today" in her timezone and returns every day, empty ones included.
export function usePlan() {
  return useApi('plan.get', { input: { days: PLAN_DAYS } });
}

// One day (the day page): the same read, from that date.
export function usePlanDay(date: string) {
  return useApi('plan.get', { input: { from: date, days: 1 } });
}

// "Thu 1 Oct" for a calendar date, months from the table (never "Sept"). Twin of web lib/dates.ts.
export function dayLabel(date: string, today?: string): string {
  if (date === today) return copy.today;
  return weekdayDayMonth(date);
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

// Her name for a day, with or without looks on it; the looks there carry it too (server-side).
export function useNameDay() {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useApiMutation('plan.nameDay', {
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
