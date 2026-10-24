'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook, looks as looksCopy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';
import { LookImage } from './look-image';
import { LookPicture } from './look-page';

const copy = looksCopy.page;
const onImage =
  'absolute z-10 flex size-10 items-center justify-center rounded-pill bg-bg/90 text-ink shadow-sm hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:text-ink-faint';

// The look's picture carries its two doors, as beta's does: the day it is worn, bottom left, and
// her own photograph of it, bottom right. Both sit ON the photograph — nothing between the look
// and what she does with it.
export function LookHero({ look, onDiary }: { look: Look; onDiary: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const attach = useApiMutation('looks.photo', {
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: look.id } }), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });

  const onPicked = async (picked: File | undefined) => {
    if (!picked) return;
    setUploading(true);
    try {
      const asset = await uploadPhoto(api, picked, 'look_photo');
      attach.mutate({ params: { id: look.id }, input: { assetId: asset.id } });
    } catch (err) {
      toast({ message: errorCopy(err) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {look.frame ? (
          <LookPicture look={look} />
        ) : (
          <LookImage look={look} priority sizes="(min-width: 768px) 40vw, 100vw" />
        )}
        <button
          type="button"
          onClick={onDiary}
          aria-label={lookbook.card.diary}
          title={lookbook.card.diary}
          className={`${onImage} bottom-3 left-3`}
        >
          <Icon name="plan" size={17} />
        </button>
        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={uploading || attach.isPending}
          aria-label={copy.addPhoto}
          title={copy.addPhoto}
          className={`${onImage} right-3 bottom-3`}
        >
          <Icon name="camera" size={17} />
        </button>
        <input
          ref={file}
          type="file"
          accept={PHOTO_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void onPicked(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
