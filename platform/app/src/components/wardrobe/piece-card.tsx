'use client';

import { wardrobe } from '@robes/copy';
import { nameWithoutBrand, pieceEyebrow } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import Link from 'next/link';
import { type PointerEvent, type ReactNode, useRef, useState } from 'react';

const copy = wardrobe.card;
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export interface CardPiece {
  id: string;
  label: string;
  category: string;
  categoryL2: string | null;
  brand: string | null;
}

export interface CardStatus {
  text: string;
  // "Never worn" and a wish's "Not yours yet" read in the warm rose.
  warm: boolean;
  // A failed read is an error, not a label: sentence case, in danger, with its icon.
  error?: boolean;
}

// Eyebrow "BOTTOMS · M&S" in one quiet tone (rose is kept for Robes' hand and "Never worn"),
// then the Cormorant Light name and the status. Every piece row composes these (the wardrobe, the
// look's rack). The native twin is mobile/src/features/wardrobe/PieceCard.tsx.
export function cardLines({
  piece,
  href,
  status,
}: {
  piece: Omit<CardPiece, 'id'>;
  href?: string;
  status?: CardStatus | null;
}) {
  const eye = pieceEyebrow(piece);
  const name = nameWithoutBrand(piece.label, piece.brand);
  return {
    eyebrow: (
      <p className="truncate font-normal font-sans text-[10px] tracking-[0.22em] text-ink-faint uppercase">
        {eye.brand ? `${eye.category} · ${eye.brand}` : eye.category}
      </p>
    ),
    name: (
      <h3 className="line-clamp-2 font-display text-[19px] leading-[1.15] font-light text-ink">
        {href ? (
          // The whole card opens the piece (a stretched link; the actions sit above it).
          <Link href={href} draggable={false} className={`after:absolute after:inset-0 ${focus}`}>
            {name}
          </Link>
        ) : (
          name
        )}
      </h3>
    ),
    status: !status ? null : status.error ? (
      <p className="flex items-center gap-1.5 font-sans text-danger text-xs">
        <Icon name="alert" size={14} className="shrink-0" />
        {status.text}
      </p>
    ) : (
      <p
        className={`font-normal font-sans text-[10px] tracking-[0.22em] uppercase ${
          status.warm ? 'text-accent-warm' : 'text-ink-muted'
        }`}
      >
        {status.text}
      </p>
    ),
  };
}

// The hairline star circle (32pt on a tile, 40pt on a row; 44pt to the finger): on is raised on
// the warm edge, never black.
export function StarButton({
  label,
  on,
  onToggle,
  tile = false,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  tile?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? copy.unstar(label) : copy.star(label)}
      title={on ? copy.unstar(label) : copy.star(label)}
      onClick={onToggle}
      className={`relative z-10 inline-flex shrink-0 items-center justify-center rounded-pill border ${
        tile ? 'size-8 after:absolute after:-inset-1.5' : 'size-10'
      } ${
        on
          ? 'border-selected-line bg-selected text-ink'
          : `border-hairline text-ink-muted ${tile ? 'bg-surface-raised/90' : 'bg-surface-raised'}`
      } ${focus}`}
    >
      <Icon name="star" size={tile ? 14 : 15} filled={on} />
    </button>
  );
}

export function BoughtButton({
  label,
  onBought,
  busy,
  tile = false,
}: {
  label: string;
  onBought: () => void;
  busy: boolean;
  tile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onBought}
      disabled={busy}
      aria-label={copy.boughtLabel(label)}
      className={`relative z-10 inline-flex shrink-0 items-center rounded-pill border border-rule-mid bg-surface-raised font-sans text-ink-muted hover:border-border-control hover:text-ink disabled:text-ink-faint ${
        tile ? 'h-8 px-3.5 text-xs after:absolute after:-inset-1.5' : 'h-10 px-4 text-[13px]'
      } ${focus}`}
    >
      {copy.bought}
    </button>
  );
}

const OPEN_AT = 88;
const ASK_AT = 160;

// Swipe to let go (legacy _wrSwipeInit): a drag slides the face over the Remove; past 44px it
// rests open at 88, past 160 it removes. Keyboard users reach the Remove by tabbing to it.
function SwipeRow({
  children,
  removeLabel,
  onRemove,
}: {
  children: ReactNode;
  removeLabel: string;
  onRemove: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [focused, setFocused] = useState(false);
  const drag = useRef<{ x: number; y: number; dx: number; active: boolean } | null>(null);
  const swallow = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0) return;
    drag.current = { x: e.clientX, y: e.clientY, dx, active: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    if (!d.active) {
      if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(e.clientY - d.y)) return;
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDx(Math.max(-ASK_AT - 20, Math.min(0, d.dx + mx)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    swallow.current = true;
    if (dx <= -ASK_AT) {
      setDx(0);
      onRemove();
    } else setDx(dx <= -44 ? -OPEN_AT : 0);
  };
  const shown = dx !== 0 || focused;
  return (
    <div className={`relative overflow-hidden rounded-soft ${shown ? 'bg-accent-warm' : ''}`}>
      <button
        type="button"
        onClick={() => {
          setDx(0);
          onRemove();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={removeLabel}
        className={`absolute inset-y-0 right-0 w-[88px] font-sans text-[10px] font-medium tracking-[0.2em] text-bg uppercase ${
          shown ? '' : 'opacity-0'
        } ${focus}`}
      >
        {copy.swipeRemove}
      </button>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a gesture layer; the Remove button and the row's links are the keyboard and screen-reader paths. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDx(0);
        }}
        // A link's native drag would cancel the swipe's pointer events.
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          // A drag never opens the piece.
          if (swallow.current) {
            swallow.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{ transform: `translateX(${focused && dx === 0 ? -OPEN_AT : dx}px)` }}
        className="relative touch-pan-y select-none motion-safe:transition-transform motion-safe:duration-300"
      >
        {children}
      </div>
    </div>
  );
}

// The rack card as the wardrobe's row: 52 × 64 photo, eyebrow, serif name, status, action, ›.
export function CardRow({
  piece,
  thumb,
  status,
  href,
  action,
  removeLabel,
  onRemove,
}: {
  piece: CardPiece;
  thumb: ReactNode;
  status: CardStatus;
  href?: string;
  action: ReactNode;
  removeLabel: string;
  onRemove: () => void;
}) {
  const lines = cardLines({ piece, ...(href ? { href } : {}), status });
  return (
    <SwipeRow removeLabel={removeLabel} onRemove={onRemove}>
      <div className="relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-soft border border-hairline bg-surface-raised py-3.5 pr-2.5 pl-3 hover:border-border-control">
        <div className="row-span-2 w-[52px] overflow-hidden rounded-[6px]">{thumb}</div>
        <div className="min-w-0 self-end">
          {lines.eyebrow}
          <div className="mt-1">{lines.name}</div>
        </div>
        <div className="flex items-center gap-1.5 self-end">
          {action}
          {href ? (
            <span aria-hidden className="w-5 text-center text-ink-muted">
              <Icon name="forward" size={16} />
            </span>
          ) : null}
        </div>
        <div className="col-span-2 col-start-2 self-start">{lines.status}</div>
      </div>
    </SwipeRow>
  );
}

// A grid tile (beta's card): white on a hairline, the photograph on a 3:4 white mat, then the
// same three lines; the action sits on the photograph's corner.
export function CardTile({
  piece,
  photo,
  status,
  href,
  action,
}: {
  piece: CardPiece;
  photo: ReactNode;
  status: CardStatus;
  href?: string;
  action: ReactNode;
}) {
  const lines = cardLines({ piece, ...(href ? { href } : {}), status });
  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-soft border border-hairline bg-surface-raised hover:border-border-control">
      <div className="relative bg-surface-raised p-3.5">
        <div className="overflow-hidden rounded-crisp">{photo}</div>
      </div>
      <div className="absolute top-1.5 right-1.5 z-10">{action}</div>
      <div className="flex flex-col gap-[3px] px-3 pt-2.5 pb-3">
        {lines.eyebrow}
        {lines.name}
        {lines.status}
      </div>
    </div>
  );
}

// The list ends on the dashed "+ Add a piece" row; the grid on the add tile.
export function AddCard({ href, layout }: { href: string; layout: 'list' | 'grid' }) {
  if (layout === 'list') {
    return (
      <Link
        href={href}
        className={`flex min-h-[52px] items-center justify-center gap-2 rounded-soft border border-dashed border-rule-mid font-sans text-xs text-ink-muted hover:text-ink ${focus}`}
      >
        <Icon name="plus" size={16} />
        {copy.addRow}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`flex min-h-full flex-col items-center justify-center gap-2 rounded-soft border border-dashed border-rule-mid text-ink-muted hover:text-ink ${focus}`}
    >
      <Icon name="plus" size={20} />
      <span className="font-display text-lg text-ink">{copy.addRow}</span>
      <span className="font-sans text-[11px]">{copy.addHint}</span>
    </Link>
  );
}
