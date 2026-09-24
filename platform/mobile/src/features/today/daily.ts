import { useApi, useApiMutation } from '@robes/api-client/react';
import type { DailyLook } from '@robes/contracts';
import { useRouter } from 'expo-router';
import { isTerminal, JOB_REFRESH_MS } from '../looks/ideas';

// "Dublin · 9–14°C · Light rain", or null when Robes had no weather for her day.
export function weatherLine(weather: DailyLook['weather']): string | null {
  if (!weather) return null;
  const parts = [weather.city, weather.tempRange, weather.condition].filter((p): p is string =>
    Boolean(p),
  );
  return parts.length ? parts.join(' · ') : null;
}

// Only the anchor frame renders up front; keep asking while it can still arrive.
export function anchorPending(look: DailyLook, now = Date.now()): boolean {
  const image = look.steps[0]?.items[0]?.image;
  if (image?.status === 'ready' || image?.status === 'failed') return false;
  return now - Date.parse(look.createdAt) < 3 * 60_000;
}

export function useStartDaily() {
  const router = useRouter();
  return useApiMutation('today.generate', {
    onSuccess: ({ jobId }) => router.replace(`/today/job/${jobId}`),
  });
}

// The job names its draft look after the text stage (`output.dailyLookId`).
export function useJobDaily(jobId: string) {
  const job = useApi(
    'jobs.get',
    { params: { id: jobId } },
    {
      refetchInterval: (q) =>
        isTerminal(q.state.data) || q.state.data?.output.dailyLookId ? false : JOB_REFRESH_MS,
    },
  );
  const failed = job.data?.status === 'failed' || job.data?.status === 'cancelled';
  return { job, dailyLookId: job.data?.output.dailyLookId, failed };
}

export function useDailyLook(id: string) {
  return useApi(
    'today.looks.get',
    { params: { id } },
    {
      refetchInterval: (q) =>
        q.state.data && anchorPending(q.state.data) ? JOB_REFRESH_MS : false,
    },
  );
}

export function useSaveDaily() {
  const router = useRouter();
  return useApiMutation('today.looks.save', {
    onSuccess: (look) => router.replace(`/look/${look.id}`),
  });
}
