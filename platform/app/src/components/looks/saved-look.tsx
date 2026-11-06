'use client';

import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook, looks as looksCopy, you } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useHideBack } from '@/components/shell/app-shell';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';
import { LookImage } from './look-image';
import { LookPicture } from './look-page';

const copy = lookbook.savedLook;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
// Felix's glass discs on a photo: `veil-soft` with the disc blur, an invisible ring to 44.
const glass =
  "absolute z-10 flex items-center justify-center rounded-pill bg-veil-soft text-ink backdrop-blur-[8px] after:absolute after:-inset-2.5 after:content-['']";

// Felix's SavedLook (3e; plan 2026-11-06 D8, D10): the photo edge to edge at 4:5 on `cream-100`,
// with the back disc top-left, the adjust disc bottom-left and the image stack bottom-right. The
// `Robes model` tag is gone from here (D10: the ModelStack on Home is the door to her model).
// Native twin: mobile/src/features/looks/SavedLook.tsx.
export function SavedLookPhoto({
  look,
  onAdjust,
  onImages,
}: {
  look: Look;
  // The sparkle: opens the look's thread (PR 7 brings the AdjustSheet; today it is the dock).
  onAdjust: () => void;
  onImages: () => void;
}) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  // The page's back pill stands down: the disc on the photo is the way back.
  useHideBack(true);
  // Every saved look can be worn by a model: her twin, her filed cell, else a Robes model —
  // `stand`, the one renderOnModel draws on (beta dressed every saved look on open).
  const me = useApi('me.model.get');
  const canDress = !!me.data?.stand?.imageUrl && look.pieces.length > 0 && !look.frame;
  const dress = useApiMutation('looks.renderOnModel', {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!canDress || look.model !== null || look.onModel === 'pending') return;
    if (look.status !== 'saved' || opened.current === look.id) return;
    opened.current = look.id;
    void api
      .call('looks.renderOnModel', { params: { id: look.id } })
      .then(() => queryClient.invalidateQueries({ queryKey: key }))
      .catch(() => undefined);
  }, [api, canDress, key, look.id, look.model, look.onModel, look.status, queryClient]);
  const dressing = (look.onModel === 'pending' || dress.isPending) && !look.frame;
  const hasPhoto = look.photo !== null;
  return (
    // Bled past the page gutter on a phone (Felix: margin 0 -20px inside a 20px-padded screen).
    <div className="relative -mx-4 overflow-hidden bg-surface-sunk md:mx-0 md:rounded-tile">
      {look.frame && !(hasPhoto && look.record === 'photo') ? (
        <LookPicture look={look} />
      ) : (
        <LookImage look={look} priority sizes="(min-width: 768px) 40vw, 100vw" />
      )}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label={copy.back}
        title={copy.back}
        data-testid="saved-look-back"
        className={`${glass} ${focus} top-2.5 left-3 size-9`}
      >
        <Icon name="back" size={20} className="-ml-0.5" />
      </button>
      {dressing ? (
        <p
          role="status"
          className="absolute top-3 right-3 z-10 rounded-pill border border-hairline bg-bg/90 px-3 py-1.5 font-sans text-ink-muted text-xs"
        >
          {you.model.dressing}
        </p>
      ) : look.onModel === 'failed' && canDress && look.record !== 'photo' ? (
        // The rack changed and the re-draw failed: say so, never pass the old picture off.
        <button
          type="button"
          onClick={() => dress.mutate({ params: { id: look.id } })}
          className={`absolute top-3 right-3 z-10 min-h-11 rounded-pill border border-hairline bg-bg/90 px-3 font-sans text-ink text-xs ${focus}`}
        >
          {you.model.undressed}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onAdjust}
        aria-label={copy.adjust}
        title={copy.adjust}
        data-testid="saved-look-adjust"
        className={`${glass} ${focus} bottom-[25px] left-5 size-6`}
      >
        <Icon name="describe" size={13} />
      </button>
      <ImageStack look={look} onOpen={onImages} />
    </div>
  );
}

// The image-stack badge: three fanned cards (a dashed paper back card, the next photograph at 4°,
// the one in front) with an ink badge that counts her photographs, or reads + before the first.
function ImageStack({ look, onOpen }: { look: Look; onOpen: () => void }) {
  const front = look.record === 'photo' ? (look.photo ?? look.model) : (look.model ?? look.photo);
  const next = look.images.find((i) => i.image.assetId !== front?.assetId)?.image ?? null;
  const count = look.images.length;
  const src = (img: typeof front) => (img ? imageSources(img.renditions)?.src : undefined);
  const card = 'absolute box-border overflow-hidden rounded-xs bg-no-repeat bg-cover';
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={count ? `${copy.images} · ${looksCopy.page.wears.count(count)}` : copy.images}
      title={copy.images}
      data-testid="saved-look-stack"
      className={`absolute right-5 bottom-[18px] z-10 h-[38px] w-10 drop-shadow-[0_2px_6px_rgb(32_32_33/0.3)] after:absolute after:-inset-2.5 after:content-[''] ${focus}`}
    >
      <span
        aria-hidden
        className={`${card} top-0 left-4 h-[29px] w-[22px] rotate-[9deg] border border-ink-faint border-dashed bg-veil-paper`}
      />
      <span
        aria-hidden
        className={`${card} top-[3px] left-[9px] h-[29px] w-[22px] rotate-[4deg] border border-surface-raised bg-surface-sunk shadow-[0_1px_3px_rgb(32_32_33/0.18)]`}
        style={next ? { backgroundImage: `url(${JSON.stringify(src(next))})` } : undefined}
      />
      <span
        aria-hidden
        className={`${card} top-[7px] left-0 h-[31px] w-6 border-[1.5px] border-surface-raised bg-surface-sunk shadow-[0_1px_4px_rgb(32_32_33/0.25)] [background-position:50%_20%]`}
        style={front ? { backgroundImage: `url(${JSON.stringify(src(front))})` } : undefined}
      />
      <span
        aria-hidden
        className="absolute -top-[9px] -right-[9px] flex h-5 min-w-5 items-center justify-center rounded-pill border-[1.5px] border-surface-raised bg-ink px-1 font-medium font-sans text-[11px] text-bg leading-none"
      >
        {count ? count : <Icon name="plus" size={11} />}
      </span>
    </button>
  );
}
