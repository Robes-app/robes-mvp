import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { Trip } from '@robes/contracts';
import { trips as copy, errors, wardrobe } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { isTerminal, JOB_REFRESH_MS } from '../looks/ideas';

export function useStartTrip() {
  const router = useRouter();
  return useApiMutation('travel.plan', {
    onSuccess: ({ jobId }) => router.replace(`/trip/job/${jobId}`),
  });
}

// The job names its trip after the text stage (`output.tripId`).
export function useJobTrip(jobId: string) {
  const job = useApi(
    'jobs.get',
    { params: { id: jobId } },
    {
      refetchInterval: (q) =>
        isTerminal(q.state.data) || q.state.data?.output.tripId ? false : JOB_REFRESH_MS,
    },
  );
  const failed = job.data?.status === 'failed' || job.data?.status === 'cancelled';
  return { job, tripId: job.data?.output.tripId, failed };
}

export function useTrip(id: string) {
  return useApi('trips.get', { params: { id } });
}

// "Lisbon, Portugal · 15–27°C · clear", or null without weather.
export function tripWeatherLine(trip: Trip): string | null {
  const w = trip.weather;
  if (!w?.tempRange) return null;
  return [w.country ? `${w.city}, ${w.country}` : w.city, w.tempRange, w.condition]
    .filter(Boolean)
    .join(' · ');
}

export function usePinTrip(trip: Trip) {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useApiMutation('trips.pin', {
    onSuccess: ({ lookIds }) => {
      queryClient.setQueryData(queryKeys.call('trips.get', { params: { id: trip.id } }), {
        ...trip,
        pinnedLookIds: lookIds,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      toast.show({ message: copy.page.pinned });
    },
    onError: () => toast.show({ message: errors.internal }),
  });
}

export function useRemoveTrip() {
  const toast = useToast();
  const client = useApiClient();
  return useUndoableMutation('trips.delete', {
    optimistic: () => [],
    invalidate: () => [queryKeys.route('trips.list'), queryKeys.route('plan.get')],
    onError: () => toast.show({ message: errors.internal }),
    undo: {
      onAvailable: (handle) =>
        toast.show({
          message: copy.page.removed,
          action: { label: wardrobe.undo, onPress: () => void handle.undo() },
        }),
      compensate: (args) => client.call('trips.restore', { params: { id: args.params.id } }),
    },
  });
}
