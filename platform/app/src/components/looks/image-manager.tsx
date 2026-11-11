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
  stageRemove,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Image, useToast } from '@robes/ui';
import { useEffect, useRef, useState } from 'react';
import { CaptureCamera } from '@/components/capture/capture-camera';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';
import { localPreview } from '@/lib/local-previews';
import { uploadPhoto } from '@/lib/upload';
import { LookPicture } from './look-page';

const copy = lookbook.savedLook.manager;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export type StageUpdate = (update: (stage: ImageStage) => ImageStage) => void;

// Felix's ImageManager (D19, D20) as the Edit look photo strip (Capture PRD flow 3; prototype
// "Add a photo to a look"): the look's pictures as 244 × 320 cards on a warm band, the one in view
// centred. Robes' picture leads with its sparkle (unless she hid it), then her photographs, then
// the dashed Add a photo card, which opens the camera that only adds an image — it never reads the
// pieces. Add to look uploads the photograph and it settles into the strip, in focus; every card
// has its × but the last one left. ✓ hands the card in view to the owner as the cover: a saved
// look keeps the strip there and then (never waiting for Update look), a draft as it is saved. Opened from the Edit look drawer or Home's stack,
// the Add a photo card is in focus. Native twin: mobile/src/features/looks/ImageManager.tsx.
export function ImageManager({
  look,
  stage,
  onStage,
  onDone,
  busy = false,
  focusAdd = false,
  onBack,
}: {
  look: Look;
  stage: ImageStage;
  onStage: StageUpdate;
  // The card in view as she taps ✓; null on the Add a photo card, which leaves the front as it was.
  onDone: (front: StageCard | null) => void;
  // The strip is being kept: ✓ waits.
  busy?: boolean;
  focusAdd?: boolean;
  // On the saved look's page (3e) the band carries the back disc that stood on the picture, so
  // she can always leave.
  onBack?: () => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const strip = useRef<HTMLDivElement>(null);
  const inView = useRef(0);
  // While the strip scrolls itself to a card, the card in view is that card: a ✓ mid-scroll must
  // never read a card it passes on the way. Her own touch takes the strip back.
  const steering = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [camera, setCamera] = useState(false);
  const [failed, setFailed] = useState(false);
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
    steering.current = smooth ? index : null;
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
    const step = first.offsetWidth + 12;
    const at = Math.round(el.scrollLeft / Math.max(1, step));
    if (steering.current !== null) {
      if (at === steering.current) steering.current = null;
      return;
    }
    inView.current = at;
  };
  const finish = () => {
    if (busy) return;
    onDone(cards[inView.current] ?? null);
  };
  // Add to look: the photograph uploads, joins the stage, and the camera gives way to the strip.
  const onPicked = async (picked: File) => {
    setUploading(true);
    setFailed(false);
    try {
      const asset = await uploadPhoto(api, picked, 'look_photo');
      onStage((s) => stageAdd(s, asset.id));
      setCamera(false);
    } catch (err) {
      setFailed(true);
      toast({ message: errorCopy(err) });
    } finally {
      setUploading(false);
    }
  };
  const cardSize = 'h-[320px] w-[244px] shrink-0 snap-center rounded-[4px]';
  const cardClass = `relative overflow-hidden bg-surface-sunk shadow-[0_10px_24px_-14px_rgb(32_32_33/0.4)] ${cardSize}`;
  let photoNo = 0;
  return (
    <section
      aria-label={copy.title}
      data-testid="image-manager"
      className="relative h-[360px] overflow-hidden bg-surface-sunk"
    >
      <div
        ref={strip}
        onScroll={onScroll}
        onPointerDown={() => {
          steering.current = null;
        }}
        className="absolute inset-0 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[calc(50%-122px)] motion-safe:animate-fade-in [scrollbar-width:none]"
      >
        {cards.map((card) => {
          const label = card.kind === 'robes' ? copy.robes : copy.photo(++photoNo);
          return (
            <figure
              key={card.kind === 'robes' ? 'robes' : card.kind === 'photo' ? card.id : card.assetId}
              aria-label={label}
              data-testid={`image-card-${card.kind}`}
              className={`${cardClass} ${card.kind === 'added' ? 'motion-safe:animate-pop' : ''}`}
            >
              <CardPicture look={look} card={card} alt={label} />
              {card.kind === 'robes' ? (
                // Robes drew this one: its sparkle, bottom-right (PRD 3.1).
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-2.5 bottom-2.5 text-white/85 drop-shadow-[0_1px_2px_rgb(32_32_33/0.35)]"
                >
                  <Icon name="describe" size={16} />
                </span>
              ) : null}
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
        <button
          type="button"
          onClick={() => setCamera(true)}
          data-testid="image-card-add"
          className={`flex flex-col items-center justify-center gap-3 border border-border-control border-dashed bg-bg ${cardSize} ${focus}`}
        >
          <span className="flex size-[52px] items-center justify-center rounded-pill bg-surface-raised text-ink shadow-float">
            <Icon name="camera" size={19} />
          </span>
          <span className="font-medium font-sans text-[9px] text-ink-muted uppercase tracking-[0.16em]">
            {copy.add}
          </span>
        </button>
      </div>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={lookbook.savedLook.back}
          title={lookbook.savedLook.back}
          data-testid="saved-look-back"
          className={`absolute top-2.5 left-3 z-10 flex size-9 items-center justify-center rounded-pill bg-veil-soft text-ink backdrop-blur-[8px] after:absolute after:-inset-2.5 after:content-[''] ${focus}`}
        >
          <Icon name="back" size={20} className="-ml-0.5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={finish}
        disabled={busy}
        aria-label={copy.done}
        aria-busy={busy}
        title={copy.done}
        data-testid="image-manager-done"
        className={`absolute right-4 bottom-4 z-10 flex size-11 items-center justify-center rounded-pill bg-scrim text-bg backdrop-blur-[8px] disabled:opacity-50 ${focus}`}
      >
        <Icon name="check" size={18} />
      </button>
      {camera ? (
        <CaptureCamera
          copy={copy.camera}
          review="pills"
          busy={uploading}
          error={failed ? copy.camera.failed : null}
          onUse={(file) => void onPicked(file)}
          onClose={() => {
            setFailed(false);
            setCamera(false);
          }}
        />
      ) : null}
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
