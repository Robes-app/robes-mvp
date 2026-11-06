'use client';

import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { diary } from '@robes/copy';
import { pieceMatches, sheetCategoryOf, sheetChips } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Button, Pill, Sheet, Skeleton, Text } from '@robes/ui';
import { useEffect, useRef, useState } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { flyoutCta } from '@/lib/diary';
import { usePhotoFiling } from '@/lib/file-photo';
import { PHOTO_ACCEPT } from '@/lib/upload';

const copy = diary.flyout;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

const inCategory = (p: Piece, c: string) => sheetCategoryOf(p) === c || p.category === c;

// The wardrobe flyout (design 3k, plan §1.9): the hanger's sheet. A search, one row of category
// chips with counts, a 3-up grid with Photograph one first, a tick on every piece; Include puts
// the ticked pieces into the prompt as tokens. Multi-select, unlike SwapSheet (one piece, one
// swap). The native twin is mobile/src/features/wardrobe/WardrobePicker.tsx.
export function WardrobePicker({
  open,
  title,
  carried,
  onClose,
  onApply,
}: {
  open: boolean;
  // "Build today around" / "Build Tuesday around".
  title: string;
  // The pieces the box already holds; they open ticked.
  carried: readonly Piece[];
  onClose: () => void;
  onApply: (pieces: Piece[]) => void;
}) {
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const all = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');
  const chips = sheetChips(all.map(sheetCategoryOf));
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const { filing, file, reset } = usePhotoFiling();
  const camera = useRef<HTMLInputElement>(null);
  const search = useRef<HTMLInputElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the carried pieces open ticked, once per opening
  useEffect(() => {
    if (open) {
      setPicked([...carried]);
      setCategory(null);
      setQuery('');
      reset();
    }
  }, [open]);
  // A photograph files straight in and is ticked the moment Robes has read it.
  const filed = filing.phase === 'filed' ? filing.piece : null;
  useEffect(() => {
    if (filed && !picked.some((p) => p.id === filed.id)) setPicked((ps) => [...ps, filed]);
  }, [filed, picked]);

  const searching = query.trim().length > 0;
  const shown = searching
    ? all.filter((p) => pieceMatches(p, query))
    : category
      ? all.filter((p) => inCategory(p, category))
      : all;
  const count = (c: string | null) => (c ? all.filter((p) => inCategory(p, c)).length : all.length);
  const on = (p: Piece) => picked.some((x) => x.id === p.id);
  const toggle = (p: Piece) =>
    setPicked((ps) =>
      ps.some((x) => x.id === p.id) ? ps.filter((x) => x.id !== p.id) : [...ps, p],
    );
  const cta = flyoutCta(picked.length, carried.length);
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      initialFocus={search}
      closeLabel={copy.cancel}
      eyebrow={<span className="text-accent-warm">{copy.eyebrow}</span>}
      title={title}
      footer={
        cta.ready ? (
          <Button
            variant="primary"
            onClick={() => {
              onApply(picked);
              onClose();
            }}
          >
            {cta.label}
          </Button>
        ) : (
          <p
            className="flex min-h-12 w-full items-center justify-center rounded-pill border border-rule-mid px-4 font-sans text-ink-muted text-xs"
            data-testid="flyout-idle"
          >
            {cta.label}
          </p>
        )
      }
    >
      <div className="flex flex-col gap-3" data-testid="wardrobe-picker">
        <label className="flex min-h-11 items-center gap-2.5 rounded-pill border border-rule-mid bg-surface-raised px-4 focus-within:border-ink">
          <Icon name="search" size={13} className="shrink-0 text-ink-muted" />
          <span className="sr-only">{copy.search}</span>
          <input
            ref={search}
            type="search"
            value={query}
            placeholder={copy.search}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-sans text-ink text-sm placeholder:text-ink-muted focus:outline-none"
          />
        </label>
        {/* One row of chips that scrolls sideways, each with how many pieces it holds. */}
        <div className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
          <Pill
            size="sm"
            className="shrink-0"
            selected={!searching && category === null}
            onClick={() => {
              setQuery('');
              setCategory(null);
            }}
          >
            {copy.all} <span className="text-ink-faint">{count(null)}</span>
          </Pill>
          {chips.map((c) => (
            <Pill
              key={c}
              size="sm"
              className="shrink-0 whitespace-nowrap"
              selected={!searching && category === c}
              onClick={() => {
                setQuery('');
                setCategory(c);
              }}
            >
              {c} <span className="text-ink-faint">{count(c)}</span>
            </Pill>
          ))}
        </div>
        {!pieces.data ? (
          <div aria-busy className="grid grid-cols-3 gap-x-2.5 gap-y-3">
            <Skeleton className="aspect-3/4" />
            <Skeleton className="aspect-3/4" />
            <Skeleton className="aspect-3/4" />
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-x-2.5 gap-y-3" aria-label={copy.eyebrow}>
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
                {filing.phase === 'uploading' || filing.phase === 'reading'
                  ? diary.flyout.adds
                  : copy.adds}
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
                  if (f) void file(f);
                }}
              />
            </li>
            {shown.map((piece) => {
              const ticked = on(piece);
              return (
                <li key={piece.id} className="flex flex-col">
                  <button
                    type="button"
                    aria-pressed={ticked}
                    aria-label={copy.pick(piece.label)}
                    onClick={() => toggle(piece)}
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
                  <span className="mt-1.5 line-clamp-2 font-display text-ink text-sm leading-tight">
                    {piece.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
