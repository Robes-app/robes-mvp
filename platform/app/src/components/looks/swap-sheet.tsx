'use client';

import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { pieceMatches, sheetCategoryOf, sheetChips, theName } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Button, Pill, Sheet, Text } from '@robes/ui';
import { useEffect, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { PieceImage } from '@/components/wardrobe/piece-image';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

const inCategory = (p: Piece, c: string) => sheetCategoryOf(p) === c || p.category === c;

// The one wardrobe sheet behind every + and every swap (legacy 2026-10-15, design 2 / 4a): a
// search over the whole wardrobe, one scrolling row of chips (All leads; it opens on the tapped
// slot's category), a 3-up grid of her pieces with "Photograph one" first when she can snap a new
// piece straight in. A tap adds; a swap picks, then "Swap in …" commits (or the tap itself,
// `instant`); closing changes nothing. The native twin is mobile/src/features/looks/SwapSheet.tsx.
export function SwapSheet({
  open,
  swapping,
  onRack,
  onClose,
  onPick,
  opensOn = null,
  title,
  onSnap,
  instant = false,
}: {
  open: boolean;
  swapping: { name: string; category: string; pieceId?: string | null } | null;
  // Adding from a figure's slot opens on that category, filed or not.
  opensOn?: string | null;
  onRack: readonly string[];
  onClose: () => void;
  onPick: (piece: Piece) => void;
  // "Add a top" from a hotspot; else "Add a piece".
  title?: string;
  // "Photograph one": the photograph files straight into her wardrobe and onto the look.
  onSnap?: (file: File) => void;
  // One tap swaps (a suggestion, legacy 0.1; a saved look while she edits, L5); its Undo is the way back.
  instant?: boolean;
}) {
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const all = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');
  const current = swapping?.pieceId ? all.find((p) => p.id === swapping.pieceId) : undefined;
  const ready = all.filter((p) => !onRack.includes(p.id));
  const chips = sheetChips(ready.map(sheetCategoryOf));
  // undefined: open on the preset; null: she chose All.
  const [category, setCategory] = useState<string | null | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece | null>(null);
  const { track } = useAnalytics().analytics;
  // Fires as the sheet opens, once per opening.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per opening, not per prop.
  useEffect(() => {
    if (open) track('swap_drawer_opened', { mode: swapping ? 'swap' : 'add' });
  }, [open]);
  const file = useRef<HTMLInputElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const preset = swapping?.category ?? opensOn;
  const active =
    category !== undefined
      ? category
      : preset && (chips.includes(preset) || ready.some((p) => inCategory(p, preset)))
        ? preset
        : null;
  const searching = query.trim().length > 0;
  const shown = searching
    ? ready.filter((p) => pieceMatches(p, query))
    : active
      ? ready.filter((p) => inCategory(p, active))
      : ready;
  const close = () => {
    setPicked(null);
    setCategory(undefined);
    setQuery('');
    onClose();
  };
  const choose = (c: string | null) => {
    setQuery('');
    setCategory(c);
  };
  return (
    <Sheet
      open={open}
      initialFocus={first}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      eyebrow={
        <span className="text-accent-warm">
          {swapping ? copy.sheet.swapEyebrow : copy.sheet.eyebrow}
        </span>
      }
      title={
        swapping
          ? copy.swap.title(theName(swapping.name).replace(/^the /, ''))
          : (title ?? copy.swap.add)
      }
      footer={
        swapping && picked && !instant ? (
          <Button
            variant="primary"
            onClick={() => {
              onPick(picked);
              close();
            }}
          >
            {copy.swap.swapIn(picked.label)}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <label
          className={`flex min-h-11 items-center gap-2 rounded-pill border border-border-control bg-surface-raised px-4 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink focus-within:ring-inset`}
        >
          <Icon name="search" size={16} className="text-ink-muted" />
          <span className="sr-only">{copy.sheet.search}</span>
          <input
            type="search"
            value={query}
            placeholder={copy.sheet.search}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-sans text-sm text-ink placeholder:text-ink-muted focus:outline-none focus-visible:outline-none"
          />
        </label>
        {/* One row of chips that scrolls sideways, never a wrapped block (beta). */}
        <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
          <Pill
            ref={first}
            className="shrink-0"
            selected={!searching && active === null}
            onClick={() => choose(null)}
          >
            {copy.swap.all}
          </Pill>
          {chips.map((c) => (
            <Pill
              key={c}
              className="shrink-0 whitespace-nowrap"
              selected={!searching && active === c}
              onClick={() => choose(c)}
            >
              {c}
            </Pill>
          ))}
        </div>
        {pieces.data && shown.length === 0 ? (
          <Text tone="muted">
            {searching
              ? copy.sheet.noMatch(query.trim())
              : active
                ? copy.sheet.emptyCategory(active)
                : copy.swap.empty}
            {onSnap && !searching ? ` ${copy.sheet.emptyHint}.` : ''}
          </Text>
        ) : null}
        <ul className="grid grid-cols-3 gap-3" aria-label={copy.sheet.eyebrow}>
          {onSnap ? (
            <li className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => file.current?.click()}
                className={`flex aspect-3/4 w-full flex-col items-center justify-center gap-2 rounded-crisp border border-dashed border-border-control bg-surface text-ink-muted hover:text-ink ${focus}`}
              >
                <Icon name="camera" size={20} />
                <span className="px-2 text-center font-sans text-[10px] uppercase tracking-[0.18em]">
                  {copy.sheet.photograph}
                </span>
              </button>
              <Text size="caption" tone="faint" className="font-display italic">
                {swapping ? copy.sheet.swapsIn : copy.sheet.filesIn}
              </Text>
              <input
                ref={file}
                type="file"
                accept="image/*"
                // The one camera door: it opens the camera on a phone, the file picker elsewhere.
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  onSnap(f);
                  close();
                }}
              />
            </li>
          ) : null}
          {current && !searching ? (
            <li className="flex flex-col gap-1 opacity-60">
              <PieceImage piece={current} sizes="140px" mat className="rounded-crisp" />
              <Text size="caption" className="line-clamp-2 font-display">
                {copy.sheet.inLook}
              </Text>
            </li>
          ) : null}
          {shown.map((piece) => (
            <li key={piece.id}>
              <button
                type="button"
                aria-pressed={swapping && !instant ? picked?.id === piece.id : undefined}
                onClick={() => {
                  if (!swapping || instant) {
                    onPick(piece);
                    close();
                  } else setPicked(piece);
                }}
                className={`flex w-full flex-col gap-1 rounded-crisp text-left ${picked?.id === piece.id ? 'outline-2 outline-selected-line' : ''} ${focus}`}
              >
                <PieceImage piece={piece} sizes="140px" mat className="rounded-crisp" />
                <span className="line-clamp-2 font-display text-ink text-sm leading-snug">
                  {piece.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
