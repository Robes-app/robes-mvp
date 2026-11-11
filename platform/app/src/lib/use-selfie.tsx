'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { uploadPhoto } from '@/lib/upload';
import { useJob } from '@/lib/use-job';

const copy = you.style;
// The read's job, carried in the address from the camera to Your digital twin.
export const READ_PARAM = 'read';
export const SELFIE_ROUTE = '/you/selfie';

// The one door to her twin (plan 2026-11-05 §2.6), behind every selfie button: the selfie camera
// (designs 03–05), her photos a tap away. Native twin: mobile/src/features/you/use-selfie.tsx.
export function useSelfie(): { start: () => void } {
  const router = useRouter();
  return { start: () => router.push(SELFIE_ROUTE) };
}

// The photograph she keeps on the review (design 05): uploaded as her close-up and read for her
// colouring, then Your digital twin with the read's job in the address so that page follows the
// read (and her twin, which draws alongside it).
export function useSelfieSend(): {
  send: (photo: File) => Promise<void>;
  busy: boolean;
  error: string | null;
} {
  const api = useApiClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(photo: File) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const asset = await uploadPhoto(api, photo, 'headshot');
      const started = await api.call('me.style.analyse', {
        input: { kind: 'colour', assetId: asset.id },
      });
      router.replace(`/you/model?${READ_PARAM}=${encodeURIComponent(started.jobId)}`);
    } catch (err) {
      setError(errorCopy(err));
    } finally {
      setBusy(false);
    }
  }
  return { send, busy, error };
}

// Your digital twin, landed on from the camera: follows the read named in the address and, when
// it lands, asks for the twin — the close-up is on file only then, so the draw on mount would
// come too soon. The address is cleaned once the read is done, whichever way.
export function useSelfieRead(): { reading: boolean; error: string | null } {
  const params = useSearchParams();
  const jobId = params.get(READ_PARAM);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const draw = useApiMutation('me.model.twin', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.model.get'), data),
  });
  const drawTwin = useRef(draw.mutateAsync);
  drawTwin.current = draw.mutateAsync;
  const { job, connection } = useJob(jobId);
  const [error, setError] = useState<string | null>(null);
  const settled = useRef<string | null>(null);

  useEffect(() => {
    if (!jobId || settled.current === jobId) return;
    const lost = connection === 'unavailable';
    if (!lost && (!job || !isTerminalJobStatus(job.status))) return;
    settled.current = jobId;
    const read = !lost && job?.status === 'succeeded' && !job.output.noSubject;
    if (lost || job?.status !== 'succeeded') setError(copy.failed);
    else if (job.output.noSubject) setError(copy.noFace);
    // Still reading until her model has caught up with the read (her twin drawing, or drawn):
    // in between, the colouring it read would stand a catalog model in her place.
    void (async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.route('me.style.get') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') }),
      ]).catch(() => {});
      if (read) await drawTwin.current().catch(() => {});
      router.replace(pathname);
    })();
  }, [jobId, job, connection, queryClient, router, pathname]);

  return { reading: jobId !== null, error };
}
