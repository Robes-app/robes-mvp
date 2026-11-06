'use client';

import { useApiClient } from '@robes/api-client/react';
import { type Look, lookStack } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import {
  canRemoveCard,
  type ImageStage,
  type StageCard,
  sameCard,
  stageAdd,
  stageCards,
  stageFront,
  stageInFront,
  stageRemove,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Image, useToast } from '@robes/ui';
import { useEffect, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';
import { localPreview } from '@/lib/local-previews';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';
import { LookPicture } from './look-page';

const copy = lookbook.savedLook.manager;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export type StageUpdate = (update: (stage: ImageStage) => ImageStage) => void;

// Felix's ImageManager (D19, D20): the look's pictures as a swipeable strip of cards in the
// photo's frame, opened from the image stack. Robes' picture leads (unless she hid it), then her
// photographs, then the Add a photo card. A photo she picks uploads at once and lands in the
// frame, in focus; every card has its × but the last one left. ✓ leaves the card in view in
// front. Nothing is written here: the owner holds the stage until Update look. Opened from Home's
// stack, the Add a photo card is in focus. Native twin: mobile/src/features/looks/ImageManager.tsx.
export function ImageManager({
  look,
  stage,
  onStage,
  onDone,
  focusAdd = false,
}: {
  look: Look;
  stage: ImageStage;
  onStage: StageUpdate;
  onDone: () => void;
  focusAdd?: boolean;
}) {
  const api = useApiClient();
  const toast = useToast();
  const strip = useRef<HTMLDivElement>(null);
  const inView = useRef(0);
  const [uploading, setUploading] = useState(false);
  const base = lookStack(look);
  const cards = stageCards(base, stage);
  const removable = canRemoveCard(base, stage);

  const show = (index: number, smooth: boolean) => {
    const el = strip.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: smooth ? 'smooth' : 'auto',
    });
    inView.current = index;
  };
  // As it opens: the Add a photo card (Home's +), else the card in front.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the strip opens
  useEffect(() => {
    const front = stageFront(base, stage);
    const at = front ? cards.findIndex((c) => sameCard(c, front)) : 0;
    show(focusAdd ? cards.length : Math.max(0, at), false);
  }, []);
  // A photograph she just added comes into the frame.
  const added = stage.added.length;
  const lastAdded = useRef(added);
  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the count of added photos
  useEffect(() => {
    if (added > lastAdded.current) show(cards.length - 1, true);
    lastAdded.current = added;
  }, [added]);

  const onScroll = () => {
    const el = strip.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return;
    const step = first.offsetWidth + 10;
    inView.current = Math.round(el.scrollLeft / Math.max(1, step));
  };
  const finish = () => {
    const card = cards[inView.current];
    if (card) onStage((s) => stageInFront(s, card));
    onDone();
  };
  const onPicked = async (picked: File | undefined) => {
    if (!picked) return;
    setUploading(true);
    try {
      const asset = await uploadPhoto(api, picked, 'look_photo');
      onStage((s) => stageAdd(s, asset.id));
    } catch (err) {
      toast({ message: errorCopy(err) });
    } finally {
      setUploading(false);
    }
  };
  const cardClass =
    'relative w-full shrink-0 snap-center overflow-hidden rounded-tile bg-surface-sunk shadow-[0_10px_24px_-14px_rgb(32_32_33/0.4)]';
  let photoNo = 0;
  return (
    <section
      aria-label={copy.title}
      data-testid="image-manager"
      className="relative aspect-[4/5] overflow-hidden bg-surface-sunk"
    >
      <div
        ref={strip}
        onScroll={onScroll}
        className="absolute inset-0 flex snap-x snap-mandatory items-center gap-2.5 overflow-x-auto px-10 motion-safe:animate-[robes-zoom-in_260ms_cubic-bezier(.2,0,.2,1)] [scrollbar-width:none]"
      >
        {cards.map((card) => {
          const label = card.kind === 'robes' ? copy.robes : copy.photo(++photoNo);
          return (
            <figure
              key={card.kind === 'robes' ? 'robes' : card.kind === 'photo' ? card.id : card.assetId}
              aria-label={label}
              data-testid={`image-card-${card.kind}`}
              className={cardClass}
            >
              <CardPicture look={look} card={card} alt={label} />
              {removable ? (
                <button
                  type="button"
                  onClick={() => onStage((s) => stageRemove(base, s, card))}
                  aria-label={`${copy.remove} · ${label}`}
                  className={`absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-pill bg-veil-mid text-ink-muted after:absolute after:-inset-2 after:content-[''] ${focus}`}
                >
                  <Icon name="close" size={12} />
                </button>
              ) : null}
            </figure>
          );
        })}
        <label
          className={`flex w-full shrink-0 cursor-pointer snap-center flex-col items-center justify-center gap-2.5 rounded-tile border border-border-control border-dashed bg-bg [aspect-ratio:4/5] focus-within:outline-[1.5px] focus-within:outline-focus-ring ${uploading ? 'opacity-60' : ''}`}
        >
          <input
            type="file"
            accept={PHOTO_ACCEPT}
            aria-label={copy.add}
            disabled={uploading}
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

// One card's picture: Robes' frame or render, her photograph, or the one she just picked (shown
// from the file in hand while its renditions are made).
export function CardPicture({ look, card, alt }: { look: Look; card: StageCard; alt: string }) {
  if (card.kind === 'robes') {
    if (look.frame) return <LookPicture look={look} />;
    const robes = look.model;
    return (
      <Image
        src={robes ? (imageSources(robes.renditions)?.src ?? '') : ''}
        alt={alt}
        aspect="4:5"
        blurhash={robes?.blurhash ?? null}
      />
    );
  }
  if (card.kind === 'added') {
    return <Image src={localPreview(card.assetId) ?? ''} alt={alt} aspect="4:5" />;
  }
  const img = look.images.find((i) => i.id === card.id)?.image;
  const sources = img ? imageSources(img.renditions) : null;
  return (
    <Image
      src={sources?.src ?? ''}
      {...(sources?.srcSet ? { srcSet: sources.srcSet } : {})}
      alt={alt}
      aspect="4:5"
      blurhash={img?.blurhash ?? null}
    />
  );
}
