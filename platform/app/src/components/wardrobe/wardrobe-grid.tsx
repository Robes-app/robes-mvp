'use client';

import type { PieceImage as PieceImageData } from '@robes/contracts';
import { diary } from '@robes/copy';
import { pieceMatches, sheetCategoryOf, sheetChips } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Pill, Skeleton, Text } from '@robes/ui';
import { type ReactNode, type Ref, useRef } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { PHOTO_ACCEPT } from '@/lib/upload';

const copy = diary.flyout;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// What the grid draws: a piece of hers, or a wish (the Add Pieces picker's WISHLIST tab) with
// its price as the line under the name.
export interface GridItem {
  id: string;
  label: string;
  category: string;
  categoryL2?: string | null;
  categoryL3?: string | null;
  brand?: string | null;
  color?: string | null;
  image: PieceImageData | null;
  meta?: string | null;
}

const inCategory = (p: GridItem, c: string) => sheetCategoryOf(p) === c || p.category === c;

// The one wardrobe grid behind home's flyout (design 3k) and the draft's piece picker (Felix
// WardrobePicker): the search pill, one row of category chips with counts (All leads, the active
// one rose — Front Door PRD rev 3 §4.6), a 3-up grid with Photograph one first and a tick disc on
// every piece. What is picked, searched and filtered is the parent's; the grid only draws it.
// Native twin: mobile/src/features/wardrobe/WardrobeGrid.tsx.
export function WardrobeGrid<T extends GridItem>({
  pieces,
  picked,
  onToggle,
  pickLabel = copy.pick,
  query,
  onQuery,
  category,
  onCategory,
  onSnap,
  searchRef,
  empty,
}: {
  // Undefined while the wardrobe loads.
  pieces: readonly T[] | undefined;
  picked: readonly T[];
  onToggle: (piece: T) => void;
  // What a reader hears on a tile ("Include Silk scarf").
  pickLabel?: (label: string) => string;
  query: string;
  onQuery: (q: string) => void;
  category: string | null;
  onCategory: (c: string | null) => void;
  // "Photograph one": the photograph files straight into her wardrobe.
  onSnap?: (file: File) => void;
  searchRef?: Ref<HTMLInputElement>;
  empty?: ReactNode;
}) {
  const all = pieces ?? [];
  const chips = sheetChips(all.map(sheetCategoryOf));
  const camera = useRef<HTMLInputElement>(null);
  const searching = query.trim().length > 0;
  const shown = searching
    ? all.filter((p) => pieceMatches(p, query))
    : category
      ? all.filter((p) => inCategory(p, category))
      : all;
  const count = (c: string | null) => (c ? all.filter((p) => inCategory(p, c)).length : all.length);
  const on = (p: GridItem) => picked.some((x) => x.id === p.id);
  const choose = (c: string | null) => {
    onQuery('');
    onCategory(c);
  };
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-2.5 rounded-pill border border-rule-mid bg-surface-raised px-4 focus-within:border-ink">
        <Icon name="search" size={13} className="shrink-0 text-ink-muted" />
        <span className="sr-only">{copy.search}</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          placeholder={copy.search}
          onChange={(e) => onQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-sans text-ink text-sm placeholder:text-ink-muted focus:outline-none"
        />
      </label>
      {/* One row of chips that scrolls sideways, each with how many pieces it holds. */}
      <div className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
        <Pill
          size="sm"
          tone="rose"
          className="shrink-0"
          selected={!searching && category === null}
          count={count(null)}
          onClick={() => choose(null)}
        >
          {copy.all}
        </Pill>
        {chips.map((c) => (
          <Pill
            key={c}
            size="sm"
            tone="rose"
            className="shrink-0 whitespace-nowrap"
            selected={!searching && category === c}
            count={count(c)}
            onClick={() => choose(c)}
          >
            {c}
          </Pill>
        ))}
      </div>
      {!pieces ? (
        <div aria-busy className="grid grid-cols-3 gap-x-2.5 gap-y-3">
          <Skeleton className="aspect-3/4" />
          <Skeleton className="aspect-3/4" />
          <Skeleton className="aspect-3/4" />
        </div>
      ) : (
        <>
          {shown.length === 0 && !onSnap ? empty : null}
          <ul className="grid grid-cols-3 gap-x-2.5 gap-y-3" aria-label={copy.eyebrow}>
            {onSnap ? (
              <li className="flex flex-col">
                <button
                  type="button"
                  onClick={() => camera.current?.click()}
                  className={`flex aspect-3/4 w-full flex-col items-center justify-center gap-2.5 rounded-input border border-dashed border-selected-line bg-surface text-ink ${focus}`}
                >
                  <Icon name="camera" size={18} className="text-ink-muted" />
                  <span className="px-2 text-center font-sans text-[9px] font-medium uppercase leading-[1.4] tracking-[0.2em]">
                    {copy.photograph}
                  </span>
                </button>
                <Text size="caption" tone="muted" italic className="mt-1.5 font-display">
                  {copy.adds}
                </Text>
                <input
                  ref={camera}
                  type="file"
                  accept={PHOTO_ACCEPT}
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) onSnap(f);
                  }}
                />
              </li>
            ) : null}
            {shown.map((piece) => {
              const ticked = on(piece);
              return (
                <li key={piece.id} className="flex flex-col">
                  <button
                    type="button"
                    aria-pressed={ticked}
                    aria-label={pickLabel(piece.label)}
                    onClick={() => onToggle(piece)}
                    data-testid={`flyout-piece-${piece.id}`}
                    className={`relative flex w-full flex-col overflow-hidden rounded-input border text-left ${
                      ticked ? 'border-selected-line' : 'border-hairline'
                    } ${focus}`}
                  >
                    <PieceImage piece={piece} sizes="120px" mat />
                    <span
                      aria-hidden
                      className={`absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-pill border text-ink ${
                        ticked
                          ? 'border-selected-line bg-selected'
                          : 'border-surface-raised bg-surface-raised/70'
                      }`}
                    >
                      {ticked ? <Icon name="check" size={11} /> : null}
                    </span>
                  </button>
                  <span
                    className={`mt-1.5 font-display text-ink text-sm leading-tight ${piece.meta ? 'truncate' : 'line-clamp-2'}`}
                  >
                    {piece.label}
                  </span>
                  {piece.meta ? (
                    <span className="truncate font-sans text-[11px] text-ink-muted">
                      {piece.meta}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
