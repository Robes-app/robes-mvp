'use client';

import { useApiClient } from '@robes/api-client/react';
import type { UploadKind } from '@robes/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadPhoto } from '@/lib/upload';

export interface SittingShot {
  key: string;
  url: string;
  assetId?: string;
  failed?: boolean;
}

// A capture step's photographs as she takes them (onboarding PRD R-S4): each uploads at once, one
// at a time in the order she took them, so Save N waits only on the last. They are drafts until
// she saves (nothing is a look or a piece before that); one she takes off the strip is discarded.
// Native twin: mobile/src/features/onboarding/use-upload-sitting.ts.
export function useUploadSitting(kind: UploadKind) {
  const api = useApiClient();
  const seq = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [shots, setShots] = useState<SittingShot[]>([]);
  const removed = useRef(new Set<string>());
  // Every preview's object URL, let go when the step goes.
  const urls = useRef(new Set<string>());
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const add = useCallback(
    (file: File) => {
      const key = `s${seq.current++}`;
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      setShots((all) => [...all, { key, url }]);
      queue.current = queue.current.then(async () => {
        try {
          const asset = await uploadPhoto(api, file, kind);
          if (removed.current.has(key)) {
            void api.call('uploads.discard', { params: { id: asset.id } }).catch(() => {});
            return;
          }
          setShots((all) => all.map((s) => (s.key === key ? { ...s, assetId: asset.id } : s)));
        } catch {
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
