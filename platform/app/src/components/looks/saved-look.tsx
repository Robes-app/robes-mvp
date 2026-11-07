'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook, looks as looksCopy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { imageSources } from '@/lib/image';

const copy = lookbook.savedLook;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Every saved look can be worn by a model: her twin, her filed cell, else a Robes model —
// `stand`, the one renderOnModel draws on (beta dressed every saved look on open). Called by the
// saved look's page and the Edit look drawer (DraftLook, D17).
export function useDressOnOpen(look: Look): void {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const me = useApi('me.model.get');
  const canDress = !!me.data?.stand?.imageUrl && look.pieces.length > 0 && !look.frame;
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!canDress || look.model !== null || look.onModel === 'pending') return;
    if (look.status !== 'saved' || opened.current === look.id) return;
    opened.current = look.id;
    const key = queryKeys.call('looks.get', { params: { id: look.id } });
    void api
      .call('looks.renderOnModel', { params: { id: look.id } })
      .then(() => queryClient.invalidateQueries({ queryKey: key }))
      .catch(() => undefined);
  }, [api, canDress, look.id, look.model, look.onModel, look.status, queryClient]);
}

// The image-stack badge: three fanned cards (a dashed paper back card, the next photograph at 4°,
// the one in front) with an ink badge that counts her photographs, or reads + before the first.
export function ImageStack({ look, onOpen }: { look: Look; onOpen: () => void }) {
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
