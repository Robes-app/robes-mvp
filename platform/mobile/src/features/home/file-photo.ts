import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { isTerminal } from '@/features/looks/ideas';
import { PICKER_OPTIONS, type PickedPhoto, uploadPhoto } from '@/features/wardrobe/add-pieces';

const READ_REFRESH_MS = 1_500;

export type Filing =
  | { phase: 'idle' }
  | { phase: 'uploading' | 'reading'; preview: string; pieceId?: string; jobId?: string }
  | { phase: 'filed'; preview: string; piece: Piece }
  | { phase: 'none' | 'failed'; preview: string };

export type PhotoSource = 'camera' | 'library';

// One photo from the camera or the roll (JPEG from the picker, so HEIC never reaches the server).
export async function pickOne(source: PhotoSource): Promise<PickedPhoto | 'denied' | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : (result.assets[0] ?? null);
}

// One photograph filed quietly to her wardrobe (legacy _rbQuietFile): upload, the read as a job,
// then the filed piece.
export function usePhotoFiling(): {
  filing: Filing;
  file: (photo: PickedPhoto) => Promise<void>;
  reset: () => void;
} {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [filing, setFiling] = useState<Filing>({ phase: 'idle' });
  const jobId = filing.phase === 'reading' ? (filing.jobId ?? '') : '';
  const job = useApi(
    'jobs.get',
    { params: { id: jobId } },
    {
      enabled: Boolean(jobId),
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : READ_REFRESH_MS),
    },
  );
  const done = Boolean(jobId) && (isTerminal(job.data) || job.isError);

  useEffect(() => {
    if (filing.phase !== 'reading' || !filing.pieceId || !done) return;
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
  }, [api, queryClient, filing, done]);

  const file = useCallback(
    async (photo: PickedPhoto) => {
      const preview = photo.uri;
      setFiling({ phase: 'uploading', preview });
      try {
        const assetId = await uploadPhoto(api, photo);
        const batch = await api.call('wardrobe.batch', { input: { assetIds: [assetId] } });
        const piece = batch.pieces[0];
        const made = batch.jobs[0];
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
