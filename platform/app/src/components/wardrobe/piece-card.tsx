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
}

// Eyebrow "Category · Brand" (the brand in rose) and the serif name, two lines.
function cardLines({
  piece,
  href,
  status,
}: {
  piece: CardPiece;
  href?: string;
  status: CardStatus;
}) {
  const eye = pieceEyebrow(piece);
  const name = nameWithoutBrand(piece.label, piece.brand);
  return {
    eyebrow: (
      <p className="truncate font-sans text-[9px] tracking-[0.18em] text-ink-faint uppercase">
        {eye.category}
        {eye.brand ? <span className="text-accent-warm"> · {eye.brand}</span> : null}
      </p>
    ),
    name: (
      <h3 className="mt-1 line-clamp-2 font-display text-lg leading-tight font-normal text-ink">
        {href ? (
          // The whole card opens the piece (a stretched link; the actions sit above it).
          <Link href={href} className={`after:absolute after:inset-0 ${focus}`}>
            {name}
          </Link>
        ) : (
          name
        )}
      </h3>
    ),
    status: (
      <p
        className={`font-sans text-[9px] tracking-[0.14em] uppercase ${
          status.warm ? 'text-accent-warm' : 'text-ink-muted'
        }`}
      >
        {status.text}
      </p>
    ),
  };
}

// The 40pt hairline star circle: on is warm, never black (legacy b4b051a).
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
        tile ? 'size-9 bg-bg/90' : 'size-10 bg-bg'
      } ${on ? 'border-border-control bg-surface-sunk text-ink' : 'border-hairline text-ink-muted'} ${focus}`}
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
      className={`relative z-10 inline-flex shrink-0 items-center rounded-pill border border-hairline bg-bg font-sans text-ink hover:border-border-control disabled:text-ink-faint ${
        tile ? 'h-[34px] px-3.5 text-xs' : 'h-10 px-4 text-[13px]'
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
    <div className={`relative overflow-hidden rounded-crisp ${shown ? 'bg-accent-warm' : ''}`}>
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
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDx(0);
        }}
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
      <div className="relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-crisp border border-hairline bg-bg py-3.5 pr-2.5 pl-3 hover:border-border-control">
        <div className="row-span-2 w-[52px] overflow-hidden rounded-[6px]">{thumb}</div>
        <div className="min-w-0 self-end">
          {lines.eyebrow}
          {lines.name}
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

// A grid tile: the same three lines under the photograph; the action sits on the photograph.
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
    <div className="relative flex min-w-0 flex-col">
      <div className="relative overflow-hidden rounded-crisp border border-hairline">
        {photo}
        <div className="absolute top-2 right-2 z-10">{action}</div>
      </div>
      <div className="flex flex-col gap-0.5 px-0.5 pt-2.5">
        {lines.eyebrow}
        {lines.name}
        <div className="mt-1.5">{lines.status}</div>
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
        className={`flex min-h-[52px] items-center justify-center gap-2 rounded-crisp border border-dashed border-border-control font-sans text-xs text-ink-muted hover:text-ink ${focus}`}
      >
        <Icon name="plus" size={16} />
        {copy.addRow}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-crisp border border-dashed border-border-control text-ink-muted hover:text-ink ${focus}`}
    >
      <Icon name="plus" size={20} />
      <span className="font-display text-lg text-ink">{copy.addRow}</span>
      <span className="font-sans text-[11px]">{copy.addHint}</span>
    </Link>
  );
}
