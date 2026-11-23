import { useApiClient } from '@robes/api-client/react';
import type { UploadKind } from '@robes/contracts';
import { useCallback, useRef, useState } from 'react';
import type { CameraPhoto } from '@/features/capture/ShotCamera';
import { uploadPhoto } from '@/features/wardrobe/add-pieces';
import { report } from '@/lib/report';

export interface SittingShot {
  key: string;
  uri: string;
  assetId?: string;
  failed?: boolean;
}

// A capture step's photographs as she takes them (onboarding PRD R-S4): each uploads at once, one
// at a time in the order she took them, so Save N waits only on the last. They are drafts until
// she saves (nothing is a look or a piece before that); one she takes off the strip is discarded.
export function useUploadSitting(kind: UploadKind) {
  const api = useApiClient();
  const seq = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [shots, setShots] = useState<SittingShot[]>([]);
  // Taken off the strip while uploading: its asset is discarded once it lands.
  const removed = useRef(new Set<string>());

  const add = useCallback(
    (photo: CameraPhoto) => {
      const key = `s${seq.current++}`;
      setShots((all) => [...all, { key, uri: photo.uri }]);
      queue.current = queue.current.then(async () => {
        try {
          // A piece's photo is lifted on the phone as it uploads, so the piece can be cut out of
          // it (uploadPhoto lifts wardrobe photos only).
          const assetId = await uploadPhoto(api, photo, kind, { lift: true });
          if (removed.current.has(key)) {
            void api.call('uploads.discard', { params: { id: assetId } }).catch(() => {});
            return;
          }
          setShots((all) => all.map((s) => (s.key === key ? { ...s, assetId } : s)));
        } catch (err) {
          report(err, 'onboarding.upload');
          setShots((all) => all.map((s) => (s.key === key ? { ...s, failed: true } : s)));
        }
      });
    },
    [api, kind],
  );

  const remove = useCallback(
    (key: string) => {
      removed.current.add(key);
      setShots((all) => {
        const shot = all.find((s) => s.key === key);
        if (shot?.assetId)
          void api.call('uploads.discard', { params: { id: shot.assetId } }).catch(() => {});
        return all.filter((s) => s.key !== key);
      });
    },
    [api],
  );

  const reset = useCallback(() => setShots([]), []);
  const kept = shots.filter((s) => s.assetId);
  // Ready once every photograph has landed (or failed) and at least one has.
  const ready = kept.length > 0 && shots.every((s) => s.assetId || s.failed);
  return { shots, kept, ready, add, remove, reset };
}
