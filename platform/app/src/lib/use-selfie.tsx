'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';
import { useJob } from '@/lib/use-job';

const copy = you.style;
// The read's job, carried in the address from the camera to Your digital twin.
export const READ_PARAM = 'read';

// The one door to her twin (plan 2026-11-05 §2.6), behind every selfie button: the front camera
// on a phone (`capture="user"`), the file picker on a laptop; the photograph uploaded as her
// close-up and read for her colouring; then Your digital twin at once, the read's job in the
// address so that page can draw her when it lands. Native twin: mobile/src/features/you/use-selfie.ts.
export function useSelfie(): {
  start: () => void;
  field: ReactNode;
  busy: boolean;
  error: string | null;
} {
  const api = useApiClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const asset = await uploadPhoto(api, file, 'headshot');
      const started = await api.call('me.style.analyse', {
        input: { kind: 'colour', assetId: asset.id },
      });
      router.push(`/you/model?${READ_PARAM}=${encodeURIComponent(started.jobId)}`);
    } catch (err) {
      setError(errorCopy(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (
    <input
      ref={input}
      type="file"
      accept={PHOTO_ACCEPT}
      capture="user"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      data-testid="selfie-input"
      onChange={(e) => void onFile(e)}
    />
  );
  return { start: () => input.current?.click(), field, busy, error };
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
  const mutate = useRef(draw.mutate);
  mutate.current = draw.mutate;
  const { job, connection } = useJob(jobId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const lost = connection === 'unavailable';
    if (!lost && (!job || !isTerminalJobStatus(job.status))) return;
    const read = !lost && job?.status === 'succeeded' && !job.output.noSubject;
    if (lost || job?.status !== 'succeeded') setError(copy.failed);
    else if (job.output.noSubject) setError(copy.noFace);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.style.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
    if (read) mutate.current();
    router.replace(pathname);
  }, [jobId, job, connection, queryClient, router, pathname]);

  return { reading: jobId !== null, error };
}
