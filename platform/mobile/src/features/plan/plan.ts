import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { plan as copy, errors } from '@robes/copy';
import { weekdayDayMonth } from '@robes/core/calendar';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';

export const PLAN_DAYS = 30;

// The server picks "today" in her timezone and returns every day, empty ones included.
export function usePlan() {
  return useApi('plan.get', { input: { days: PLAN_DAYS } });
}

// "Thu 1 Oct" for a calendar date, months from the table (never "Sept"). Twin of web lib/dates.ts.
export function dayLabel(date: string, today?: string): string {
  if (date === today) return copy.today;
  return weekdayDayMonth(date);
}

// Her name for a day, with or without looks on it; the looks there carry it too (server-side).
export function useNameDay() {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useApiMutation('plan.nameDay', {
    onSuccess: () =>
      Promise.all(
        (['plan.get', 'plan.day', 'today.get'] as const).map((key) =>
          queryClient.invalidateQueries({ queryKey: queryKeys.route(key) }),
        ),
      ),
    onError: () => toast.show({ message: errors.internal }),
  });
}

export function usePinLook() {
  const queryClient = useQueryClient();
  return useApiMutation('plan.pin', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') }),
  });
}
