import { queryKeys, useApiClient } from '@robes/api-client/react';
import { type Look, lookStack } from '@robes/contracts';
import {
  EMPTY_STAGE,
  type ImageStage,
  sameCard,
  stageChanged,
  stageFront,
} from '@robes/core/looks';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorMessage } from '@/lib/errors';

export type StageUpdate = (update: (stage: ImageStage) => ImageStage) => void;

// The photo she just picked, shown from the file on the phone until its renditions are made.
const local = new Map<string, string>();
export function rememberLocalPhoto(assetId: string, uri: string): void {
  local.set(assetId, uri);
}
export function localPhoto(assetId: string): string | null {
  return local.get(assetId) ?? null;
}

// The image stack she is working (D19, D20): what she added, took out, hid and left in front,
// held until she keeps it (a saved look's on the strip's ✓, a draft's as it is saved). `commit`
// writes it in an order the server's "one image always remains" rule accepts at every step:
// adds, Robes' picture back, the cover, removals, Robes' picture hidden. Web twin:
// app/src/lib/look-images.ts.
export function useImageStage(look: Look) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<ImageStage>(EMPTY_STAGE);
  const [committing, setCommitting] = useState(false);
  const base = lookStack(look);
  const changed = stageChanged(base, stage);
  const discard = (assetIds: string[]) => {
    for (const id of assetIds) {
      void api.call('uploads.discard', { params: { id } }).catch(() => undefined);
    }
  };

  // `next` is the stage as it stands now: the strip's ✓ passes the card it has just put in front.
  const commit = async (next: ImageStage = stage): Promise<boolean> => {
    if (!stageChanged(base, next)) return true;
    setCommitting(true);
    const params = { id: look.id };
    try {
      let latest = look;
      const idFor = new Map<string, string>();
      for (const assetId of next.added) {
        latest = await api.call('looks.images.add', { params, input: { assetId } });
        const img = latest.images.find((i) => i.image.assetId === assetId);
        if (img) idFor.set(assetId, img.id);
      }
      const hide = next.robesHidden !== null && next.robesHidden !== base.robesHidden;
      if (hide && next.robesHidden === false) {
        latest = await api.call('looks.images.robes', { params, input: { hidden: false } });
      }
      const front = stageFront(base, next);
      if (front && !sameCard(front, base.cover)) {
        const imageId =
          front.kind === 'robes'
            ? null
            : front.kind === 'photo'
              ? front.id
              : (idFor.get(front.assetId) ?? null);
        latest = await api.call('looks.images.cover', { params, input: { imageId } });
      }
      for (const imageId of next.removed) {
        latest = await api.call('looks.images.remove', { params: { id: look.id, imageId } });
      }
      if (hide && next.robesHidden === true) {
        latest = await api.call('looks.images.robes', { params, input: { hidden: true } });
      }
      queryClient.setQueryData(queryKeys.call('looks.get', { params }), latest);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      setStage(EMPTY_STAGE);
      return true;
    } catch (err) {
      toast.show({ message: errorMessage(err) });
      // What landed before the failure is re-read and the stage cleared, so a second try can
      // never add the same photograph twice.
      void queryClient.invalidateQueries({ queryKey: queryKeys.call('looks.get', { params }) });
      setStage(EMPTY_STAGE);
      return false;
    } finally {
      setCommitting(false);
    }
  };

  return {
    stage,
    // A photo taken back out before it was kept is let go of at once (D20); the hourly sweep
    // catches any the app never got to.
    update: ((fn) =>
      setStage((s) => {
        const next = fn(s);
        discard(s.added.filter((a) => !next.added.includes(a)));
        return next;
      })) as StageUpdate,
    changed,
    committing,
    commit,
    // Discard: the photos she added and never kept go too.
    reset: () => {
      discard(stage.added);
      setStage(EMPTY_STAGE);
    },
  };
}
