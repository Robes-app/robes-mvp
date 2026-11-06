'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Image, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';

const copy = lookbook.savedLook.manager;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

type Card = { kind: 'robes' } | { kind: 'photo'; id: string };

// Felix's ImageManager (D13): the look's pictures as a swipeable strip of cards in the photo's
// frame, opened from the image-stack badge. Robes' picture leads the strip and can only be
// redrawn; her photographs follow, each with its ×; the last card adds one. A tap picks the card
// that leads the look, and Done keeps it (`looks.images.cover`). Native twin:
// mobile/src/features/looks/ImageManager.tsx.
export function ImageManager({ look, onDone }: { look: Look; onDone: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const landed = (updated: Look) => {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const onError = (err: unknown) => toast({ message: errorCopy(err) });
  const add = useApiMutation('looks.images.add', { onSuccess: landed, onError });
  const remove = useApiMutation('looks.images.remove', { onSuccess: landed, onError });
  const cover = useApiMutation('looks.images.cover', { onSuccess: landed, onError });
  const current: Card =
    look.record === 'photo' && look.images[0]
      ? { kind: 'photo', id: look.images[0].id }
      : { kind: 'robes' };
  const [lead, setLead] = useState<Card>(current);
  const same = (a: Card, b: Card) =>
    a.kind === b.kind && (a.kind !== 'photo' || b.kind !== 'photo' || a.id === b.id);
  const finish = () => {
    if (!same(lead, current)) {
      cover.mutate({
        params: { id: look.id },
        input: { imageId: lead.kind === 'photo' ? lead.id : null },
      });
    }
    onDone();
  };
  const onPicked = async (picked: File | undefined) => {
    if (!picked) return;
    setUploading(true);
    try {
      const asset = await uploadPhoto(api, picked, 'look_photo');
      add.mutate({ params: { id: look.id }, input: { assetId: asset.id } });
    } catch (err) {
      onError(err);
    } finally {
      setUploading(false);
    }
  };
  const cardClass =
    'relative w-full shrink-0 snap-center overflow-hidden rounded-tile bg-surface-sunk shadow-[0_10px_24px_-14px_rgb(32_32_33/0.4)]';
  const ring = (on: boolean) => (on ? 'outline outline-[1.5px] outline-ink outline-offset-2' : '');
  const robes = look.model;
  return (
    <section
      aria-label={copy.title}
      data-testid="image-manager"
      className="relative -mx-4 aspect-[4/5] overflow-hidden bg-surface-sunk md:mx-0 md:rounded-tile"
    >
      <div className="absolute inset-0 flex snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-10 motion-safe:animate-[robes-zoom-in_260ms_cubic-bezier(.2,0,.2,1)] [scrollbar-width:none]">
        {robes ? (
          <button
            type="button"
            onClick={() => setLead({ kind: 'robes' })}
            aria-pressed={lead.kind === 'robes'}
            aria-label={copy.lead(copy.robes)}
            className={`${cardClass} ${ring(lead.kind === 'robes')} ${focus}`}
          >
            <Image
              src={imageSources(robes.renditions)?.src ?? ''}
              alt={copy.robes}
              aspect="4:5"
              blurhash={robes.blurhash}
            />
          </button>
        ) : null}
        {look.images.map((img, i) => {
          const sources = imageSources(img.image.renditions);
          const on = lead.kind === 'photo' && lead.id === img.id;
          return (
            <div key={img.id} className={`${cardClass} ${ring(on)}`}>
              <button
                type="button"
                onClick={() => setLead({ kind: 'photo', id: img.id })}
                aria-pressed={on}
                aria-label={copy.lead(copy.photo(i + 1))}
                className={`block w-full ${focus}`}
              >
                <Image
                  src={sources?.src ?? ''}
                  srcSet={sources?.srcSet}
                  alt={copy.photo(i + 1)}
                  aspect="4:5"
                  blurhash={img.image.blurhash}
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (on) setLead({ kind: 'robes' });
                  remove.mutate({ params: { id: look.id, imageId: img.id } });
                }}
                disabled={remove.isPending}
                aria-label={`${copy.remove} · ${copy.photo(i + 1)}`}
                className={`absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-pill bg-veil-mid text-ink-muted after:absolute after:-inset-2 after:content-[''] ${focus}`}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          );
        })}
        <label
          className={`flex w-full shrink-0 cursor-pointer snap-center flex-col items-center justify-center gap-2.5 rounded-tile border border-border-control border-dashed bg-bg [aspect-ratio:4/5] focus-within:outline-[1.5px] focus-within:outline-focus-ring ${uploading || add.isPending ? 'opacity-60' : ''}`}
        >
          <input
            ref={file}
            type="file"
            accept={PHOTO_ACCEPT}
            aria-label={copy.add}
            disabled={uploading || add.isPending}
            className="sr-only"
            onChange={(e) => {
              void onPicked(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <span className="flex size-14 items-center justify-center rounded-pill border-[0.5px] border-rule-mid bg-surface-raised text-ink shadow-float">
            <Icon name="camera" size={22} />
          </span>
          <span className="font-medium font-sans text-[9px] text-ink-muted uppercase tracking-[0.2em]">
            {copy.add}
          </span>
        </label>
      </div>
      <button
        type="button"
        onClick={finish}
        aria-label={copy.done}
        title={copy.done}
        data-testid="image-manager-done"
        className={`absolute right-4 bottom-4 z-10 flex size-11 items-center justify-center rounded-pill bg-scrim text-bg backdrop-blur-[8px] ${focus}`}
      >
        <Icon name="check" size={18} />
      </button>
    </section>
  );
}
