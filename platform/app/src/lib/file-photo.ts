'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { uploadPhoto } from './upload';
import { useJob } from './use-job';

export type Filing =
  | { phase: 'idle' }
  | { phase: 'uploading' | 'reading'; preview: string; pieceId?: string; jobId?: string }
  | { phase: 'filed'; preview: string; piece: Piece }
  | { phase: 'none' | 'failed'; preview: string };

// One photograph filed quietly to her wardrobe (legacy _rbQuietFile): upload, the read as a job,
// then the filed piece. Cataloguing is a by-product of styling.
export function usePhotoFiling(): {
  filing: Filing;
  file: (file: File) => Promise<void>;
  reset: () => void;
} {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [filing, setFiling] = useState<Filing>({ phase: 'idle' });
  const jobId = filing.phase === 'reading' ? (filing.jobId ?? null) : null;
  const { job, connection } = useJob(jobId);

  useEffect(() => {
    if (filing.phase !== 'reading' || !filing.pieceId) return;
    const done = (job && isTerminalJobStatus(job.status)) || connection === 'unavailable';
    if (!done) return;
    const { preview, pieceId } = filing;
    void api
      .call('wardrobe.get', { params: { id: pieceId } })
      .then((piece) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
        setFiling(
          piece.status === 'ready'
            ? { phase: 'filed', preview, piece }
            : { phase: piece.status === 'failed' ? 'none' : 'failed', preview },
        );
      })
      .catch(() => setFiling({ phase: 'failed', preview }));
  }, [api, queryClient, filing, job, connection]);

  const file = useCallback(
    async (photo: File) => {
      const preview = URL.createObjectURL(photo);
      setFiling({ phase: 'uploading', preview });
      try {
        const asset = await uploadPhoto(api, photo);
        const batch = await api.call('wardrobe.batch', { input: { assetIds: [asset.id] } });
        const made = batch.jobs[0];
        const piece = batch.pieces[0];
        if (!piece) throw new Error('no_piece');
        if (piece.status === 'ready' || !made) {
          setFiling({ phase: 'filed', preview, piece });
          return;
        }
        setFiling({ phase: 'reading', preview, pieceId: made.pieceId, jobId: made.jobId });
      } catch {
        setFiling({ phase: 'failed', preview });
      }
    },
    [api],
  );

  const reset = useCallback(() => setFiling({ phase: 'idle' }), []);
  return { filing, file, reset };
}
