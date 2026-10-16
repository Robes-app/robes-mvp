'use client';

import { useApiClient } from '@robes/api-client/react';
import type { ReadPiece, UploadKind } from '@robes/contracts';
import { photoPieces as copy } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useCallback, useState } from 'react';
import { errorCopy } from './error-copy';
import { uploadPhoto } from './upload';
import { useJob } from './use-job';

export type PhotoReadStatus = 'idle' | 'reading' | 'done' | 'failed';

export interface PhotoRead {
  status: PhotoReadStatus;
  // A local object URL of her photo: shown at once, never re-downloaded.
  photoUrl: string | null;
  assetId: string | null;
  jobId: string | null;
  pieces: ReadPiece[];
  error: string | null;
  start(file: File): Promise<void>;
  reset(): void;
}

// Her photo → a direct upload → the read job, followed over SSE until every piece is found.
export function usePhotoRead(kind: UploadKind): PhotoRead {
  const client = useApiClient();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { job, connection } = useJob(jobId);

  const start = useCallback(
    async (file: File) => {
      setError(null);
      setJobId(null);
      setPhotoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      setUploading(true);
      try {
        const asset = await uploadPhoto(client, file, kind);
        setAssetId(asset.id);
        const read = await client.call('photoReads.start', { input: { assetId: asset.id } });
        setJobId(read.jobId);
      } catch (err) {
        setError(errorCopy(err));
      } finally {
        setUploading(false);
      }
    },
    [client, kind],
  );

  const reset = useCallback(() => {
    setPhotoUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setAssetId(null);
    setJobId(null);
    setError(null);
  }, []);

  const finished = job ? isTerminalJobStatus(job.status) : false;
  const failed =
    !!error ||
    connection === 'unavailable' ||
    job?.status === 'failed' ||
    job?.status === 'cancelled';
  const status: PhotoReadStatus = failed
    ? 'failed'
    : finished
      ? 'done'
      : uploading || jobId
        ? 'reading'
        : 'idle';
  return {
    status,
    photoUrl,
    assetId,
    jobId,
    pieces: finished ? (job?.output.readPieces ?? []) : [],
    error: failed ? (error ?? copy.failed) : null,
    start,
    reset,
  };
}
