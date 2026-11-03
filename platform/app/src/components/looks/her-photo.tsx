'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { looks as looksCopy } from '@robes/copy';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';

const copy = looksCopy.page;

// Her photograph of a look — one door wherever the look stands: the saved look's picture, the
// composer's canvas (a draft) and the card on a day (beta's camera on each). It lands on the LOOK
// (`looks.photo`), so every surface shows it; You · Model then picks which picture is the record.
// Native twin: mobile/src/features/looks/her-photo.tsx.
export function useHerPhoto(look: Look, onLanded?: (updated: Look) => void) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const onError = (err: unknown) => toast({ message: errorCopy(err) });
  const landed = (updated: Look) => {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const attach = useApiMutation('looks.photo', {
    onSuccess: (updated) => {
      landed(updated);
      onLanded?.(updated);
    },
    onError,
  });
  const update = useApiMutation('looks.update', {
    onSuccess: landed,
    onError: (err) => {
      onError(err);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const onPicked = async (picked: File | undefined) => {
    if (!picked) return;
    setUploading(true);
    try {
      const asset = await uploadPhoto(api, picked, 'look_photo');
      attach.mutate({ params: { id: look.id }, input: { assetId: asset.id } });
    } catch (err) {
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const hasPhoto = look.photo !== null;
  const label = hasPhoto ? copy.replacePhoto : copy.addPhoto;
  return {
    hasPhoto,
    label,
    busy: uploading || attach.isPending,
    pick: () => file.current?.click(),
    // You · Model: the tap is the choice — the picture swaps at once, then the record is saved.
    choose: (record: 'photo' | 'model') => {
      if (record === look.record) return;
      queryClient.setQueryData(key, {
        ...look,
        record,
        image: record === 'photo' ? look.photo : (look.model ?? look.photo),
      });
      update.mutate({ params: { id: look.id }, input: { record } });
    },
    // The button that calls `pick` is the door; this input is hidden from assistive tech.
    input: (
      <input
        ref={file}
        type="file"
        accept={PHOTO_ACCEPT}
        aria-hidden
        aria-label={label}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          void onPicked(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    ),
  };
}
