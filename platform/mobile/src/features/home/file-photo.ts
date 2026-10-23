import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
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
export async function pickOne(
  source: PhotoSource,
): Promise<ImagePicker.ImagePickerAsset | 'denied' | null> {
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
  // Each photograph is one attempt; a late answer for a photo she removed or replaced is dropped.
  const attempt = useRef(0);
  const settle = useCallback((n: number, next: Filing) => {
    if (n === attempt.current) setFiling(next);
  }, []);
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
    const n = attempt.current;
    void api
      .call('wardrobe.get', { params: { id: pieceId } })
      .then((piece) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
        settle(
          n,
          piece.status === 'ready'
            ? { phase: 'filed', preview, piece }
            : { phase: piece.status === 'failed' ? 'none' : 'failed', preview },
        );
      })
      .catch(() => settle(n, { phase: 'failed', preview }));
  }, [api, queryClient, filing, done, settle]);

  const file = useCallback(
    async (photo: PickedPhoto) => {
      attempt.current += 1;
      const n = attempt.current;
      const preview = photo.uri;
      setFiling({ phase: 'uploading', preview });
      try {
        const assetId = await uploadPhoto(api, photo);
        const batch = await api.call('wardrobe.batch', { input: { assetIds: [assetId] } });
        const piece = batch.pieces[0];
        const made = batch.jobs[0];
        if (!piece) throw new Error('no_piece');
        if (piece.status === 'ready' || !made) {
          settle(n, { phase: 'filed', preview, piece });
          return;
        }
        settle(n, { phase: 'reading', preview, pieceId: made.pieceId, jobId: made.jobId });
      } catch {
        settle(n, { phase: 'failed', preview });
      }
    },
    [api, settle],
  );
  const reset = useCallback(() => {
    attempt.current += 1;
    setFiling({ phase: 'idle' });
  }, []);
  return { filing, file, reset };
}
