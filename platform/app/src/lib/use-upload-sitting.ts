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

// Photos uploading at once, and the tries each gets (a second after a failure or a stall past
// uploadPhoto's deadline). Native twin: mobile/src/features/onboarding/use-upload-sitting.ts.
export const UPLOADS_AT_ONCE = 3;
export const UPLOAD_TRIES = 2;

// Which photo a file is: the same one chosen twice has the same name, size and date.
export function fileSource(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

// What the camera shows on a photo's thumbnail: still on its way, or given up (none: landed).
export function uploadState(shot: SittingShot): 'pending' | 'failed' | undefined {
  if (shot.assetId) return undefined;
  return shot.failed ? 'failed' : 'pending';
}

// A capture step's photographs as she takes them (onboarding PRD R-S4): each uploads at once,
// UPLOADS_AT_ONCE at a time in the order she took them, so Save N waits only on the last few.
// One stuck photo can no longer hold the rest: uploadPhoto gives up past its deadline and the photo
// is tried once more, then marked failed. They are drafts until she saves (nothing is a look or a
// piece before that); one she takes off the strip is discarded.
export function useUploadSitting(kind: UploadKind) {
  const api = useApiClient();
  const seq = useRef(0);
  const waiting = useRef<(() => Promise<void>)[]>([]);
  const running = useRef(0);
  const [shots, setShots] = useState<SittingShot[]>([]);
  const removed = useRef(new Set<string>());
  // Which file each shot on the strip is, and the ones this step has already saved: the same photo
  // is never taken twice, in one sitting or after Add more (25 Nov: duplicate looks).
  const sources = useRef(new Map<string, string>());
  const savedSources = useRef(new Set<string>());
  const current = useRef(shots);
  current.current = shots;
  // Every preview's object URL, let go when the step goes.
  const urls = useRef(new Set<string>());
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const pump = useCallback(() => {
    while (running.current < UPLOADS_AT_ONCE) {
      const job = waiting.current.shift();
      if (!job) return;
      running.current++;
      void job().finally(() => {
        running.current--;
        pump();
      });
    }
  }, []);

  const add = useCallback(
    (file: File): boolean => {
      const source = fileSource(file);
      if (savedSources.current.has(source) || [...sources.current.values()].includes(source))
        return false;
      const key = `s${seq.current++}`;
      sources.current.set(key, source);
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      setShots((all) => [...all, { key, url }]);
      waiting.current.push(async () => {
        for (let tries = 1; !removed.current.has(key); tries++) {
          try {
            const asset = await uploadPhoto(api, file, kind);
            if (removed.current.has(key)) {
              void api.call('uploads.discard', { params: { id: asset.id } }).catch(() => {});
              return;
            }
            setShots((all) => all.map((s) => (s.key === key ? { ...s, assetId: asset.id } : s)));
            return;
          } catch {
            if (tries < UPLOAD_TRIES) continue;
            setShots((all) => all.map((s) => (s.key === key ? { ...s, failed: true } : s)));
            return;
          }
        }
      });
      pump();
      return true;
    },
    [api, kind, pump],
  );

  const remove = useCallback(
    (key: string) => {
      removed.current.add(key);
      sources.current.delete(key);
      setShots((all) => {
        const shot = all.find((s) => s.key === key);
        if (shot?.assetId)
          void api.call('uploads.discard', { params: { id: shot.assetId } }).catch(() => {});
        return all.filter((s) => s.key !== key);
      });
    },
    [api],
  );

  // After Save: what landed is saved, so its photo can't be chosen again in this step.
  const reset = useCallback(() => {
    for (const shot of current.current) {
      const source = sources.current.get(shot.key);
      if (source && shot.assetId) savedSources.current.add(source);
    }
    sources.current.clear();
    setShots([]);
  }, []);
  const kept = shots.filter((s) => s.assetId);
  // Ready once every photograph has landed (or failed) and at least one has.
  const ready = kept.length > 0 && shots.every((s) => s.assetId || s.failed);
  return { shots, kept, ready, add, remove, reset };
}
