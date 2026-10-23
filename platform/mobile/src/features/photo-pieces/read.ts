import { useApi, useApiClient } from '@robes/api-client/react';
import type { ReadPiece, UploadKind } from '@robes/contracts';
import { photoPieces as copy, wardrobe } from '@robes/copy';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { isTerminal, JOB_REFRESH_MS } from '@/features/looks/ideas';
import {
  type AddSource,
  PICKER_OPTIONS,
  type PickedPhoto,
  uploadPhoto,
} from '@/features/wardrobe/add-pieces';

export interface ReadPhoto {
  uri: string;
  width: number;
  height: number;
}

export type ReadStatus = 'idle' | 'reading' | 'done' | 'failed';

async function pickOne(source: AddSource) {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'denied' as const;
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return result.canceled ? null : (result.assets[0] ?? null);
  }
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied' as const;
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : (result.assets[0] ?? null);
}

// One photo → presigned upload → the read job, polled until every piece is found (no SSE on
// native yet; the job row is the durable truth).
export function usePhotoRead(kind: UploadKind) {
  const api = useApiClient();
  const [photo, setPhoto] = useState<ReadPhoto | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS),
    },
  );

  // A photo already picked (the first-piece screen picks its own).
  const startPicked = useCallback(
    async (picked: PickedPhoto & { width: number; height: number }) => {
      setError(null);
      setJobId(null);
      setPhoto({ uri: picked.uri, width: picked.width, height: picked.height });
      setUploading(true);
      try {
        const assetId = await uploadPhoto(api, picked, kind);
        const read = await api.call('photoReads.start', { input: { assetId } });
        setJobId(read.jobId);
      } catch {
        setError(copy.failed);
      } finally {
        setUploading(false);
      }
    },
    [api, kind],
  );

  const start = useCallback(
    async (source: AddSource) => {
      const picked = await pickOne(source);
      if (picked === 'denied') {
        setError(source === 'camera' ? wardrobe.cameraDenied : wardrobe.photosDenied);
        return;
      }
      if (picked) await startPicked(picked);
    },
    [startPicked],
  );

  const reset = useCallback(() => {
    setPhoto(null);
    setJobId(null);
    setError(null);
  }, []);

  const data = jobId ? job.data : undefined;
  const finished = isTerminal(data);
  const failed = !!error || data?.status === 'failed' || data?.status === 'cancelled';
  const status: ReadStatus = failed
    ? 'failed'
    : finished
      ? 'done'
      : uploading || jobId
        ? 'reading'
        : 'idle';
  const pieces: ReadPiece[] = finished ? (data?.output.readPieces ?? []) : [];
  return {
    status,
    photo,
    jobId,
    pieces,
    error: failed ? (error ?? copy.failed) : null,
    start,
    startPicked,
    reset,
  };
}
