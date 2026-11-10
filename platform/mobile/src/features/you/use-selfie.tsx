import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { isTerminal, JOB_REFRESH_MS } from '@/features/looks/ideas';
import { type PickedPhoto, uploadPhoto } from '@/features/wardrobe/add-pieces';

const copy = you.style;
// The read's job, carried in the route params from the camera to Your digital twin.
export const READ_PARAM = 'read';
export const SELFIE_ROUTE = '/you/selfie';

// The one door to her twin (plan 2026-11-05 §2.6), behind every selfie button: the selfie camera
// (designs 03–05), with her photo library a tap away. Web twin: app/src/lib/use-selfie.tsx.
export function useSelfie(): {
  start: () => void;
  // From a button in a sheet: `startOnceClosed()` as it closes that sheet, whose `onClosed` is
  // `afterClose`. The camera waits for that sheet to fully go: presented over a sheet still
  // dismissing, iOS left a see-through layer over the whole app, taking every tap.
  startOnceClosed: () => void;
  afterClose: () => void;
} {
  const router = useRouter();
  const queued = useRef(false);
  const start = () => router.push(SELFIE_ROUTE);
  return {
    start,
    startOnceClosed: () => {
      queued.current = true;
    },
    afterClose: () => {
      if (!queued.current) return;
      queued.current = false;
      start();
    },
  };
}

// The photograph she keeps on the review (design 05): uploaded as her close-up and read for her
// colouring, then Your digital twin at once with the read's job in the params so that screen
// follows the read (and her twin, which draws alongside it).
export function useSelfieSend(): {
  send: (photo: PickedPhoto) => Promise<void>;
  busy: boolean;
  error: string | null;
} {
  const api = useApiClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(photo: PickedPhoto) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const assetId = await uploadPhoto(api, photo, 'headshot');
      const started = await api.call('me.style.analyse', {
        input: { kind: 'colour', assetId },
      });
      router.replace({ pathname: '/you/model', params: { [READ_PARAM]: started.jobId } });
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }
  return { send, busy, error };
}

// Your digital twin, landed on from the camera: follows the read named in the params and, when it
// lands, asks for the twin — the close-up is on file only then, so the draw on mount would come
// too soon. The param is cleared once the read is done, whichever way.
export function useSelfieRead(): { reading: boolean; error: string | null } {
  const params = useLocalSearchParams<{ [READ_PARAM]?: string }>();
  const jobId = params[READ_PARAM] ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const draw = useApiMutation('me.model.twin', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.model.get'), data),
  });
  const mutate = useRef(draw.mutate);
  mutate.current = draw.mutate;
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS),
    },
  );
  const [error, setError] = useState<string | null>(null);
  const finished = jobId !== null && (job.isError || isTerminal(job.data));

  useEffect(() => {
    if (!finished) return;
    const data = job.data;
    const read = data?.status === 'succeeded' && !data.output.noSubject;
    if (data?.status !== 'succeeded') setError(copy.failed);
    else if (data.output.noSubject) setError(copy.noFace);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.style.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
    if (read) mutate.current();
    router.setParams({ [READ_PARAM]: undefined });
  }, [finished, job.data, queryClient, router]);

  return { reading: jobId !== null, error };
}
