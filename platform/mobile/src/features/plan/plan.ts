import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { plan as copy, errors, ui } from '@robes/copy';
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

// Takes every look off a day (the Diary list's swipe): a planned look is unpinned, a worn one has
// its wear taken back, as the day's own × does (DayCard); Undo puts them all back.
export function useClearDay() {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all(
      (['plan.get', 'plan.day', 'today.get', 'looks.get', 'looks.list'] as const).map((key) =>
        queryClient.invalidateQueries({ queryKey: queryKeys.route(key) }),
      ),
    );
  const fail = () => toast.show({ message: errors.internal });
  return (date: string, entries: readonly PlanEntry[]) => {
    void Promise.all(
      entries.map((e) =>
        e.worn
          ? api.call('looks.unwear', { params: { id: e.look.id, date } })
          : api.call('plan.unpin', { params: { id: e.id } }),
      ),
    )
      .then(() =>
        toast.show({
          message: copy.list.cleared(entries.length),
          action: {
            label: ui.undo,
            onPress: () =>
              void Promise.all(
                entries.map((e) =>
                  e.worn
                    ? api.call('looks.wear', { params: { id: e.look.id }, input: { wornOn: date } })
                    : api.call('plan.restore', { params: { id: e.id } }),
                ),
              )
                .catch(fail)
                .finally(refresh),
          },
        }),
      )
      .catch(fail)
      .finally(refresh);
  };
}
