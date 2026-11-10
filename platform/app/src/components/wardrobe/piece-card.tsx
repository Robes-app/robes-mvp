'use client';

import { wardrobe } from '@robes/copy';
import { nameWithoutBrand, pieceEyebrow } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import Link from 'next/link';
import { type PointerEvent, type ReactNode, useRef, useState } from 'react';

const copy = wardrobe.card;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

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

// Eyebrow "BOTTOMS · M&S", the brand in rose (Front Door design 3b, plan 2026-11-03 §1.5), then the
// Cormorant Light name and the status. Every piece row composes these (the wardrobe, the look's
// rack). The native twin is mobile/src/features/wardrobe/PieceCard.tsx.
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
        {eye.category}
        {eye.brand ? <span className="text-accent-warm"> · {eye.brand}</span> : null}
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

const OPEN_AT = 88;
const ASK_AT = 160;

// Swipe to let go (legacy _wrSwipeInit): a drag slides the face over the action; past 44px it
// rests open at 88, past 160 it acts; a click on an open row closes it. The action reads Remove (a
// wish) or Delete (a piece she owns, which asks first). Keyboard users reach it by tabbing to it.
function SwipeRow({
  children,
  removeText = copy.swipeRemove,
  removeLabel,
  onRemove,
}: {
  children: ReactNode;
  removeText?: string;
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
    <div className={`relative overflow-hidden rounded-[3px] ${shown ? 'bg-accent-warm' : ''}`}>
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
        {removeText}
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
          // A drag never opens the piece, and a click on an open row only closes it.
          if (swallow.current || dx !== 0) {
            swallow.current = false;
            setDx(0);
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

// What a row says at its right (Front Door canvas 3b and the Rack): an owned piece's wears behind
// a calendar ("New" before the first), a wish's price, a piece to find's price behind a bag or —
// on a look — a wish's price behind a heart. `label` is what a reader hears.
export interface RowMeta {
  icon?: 'calendar' | 'heart' | 'bag';
  text?: string;
  label: string;
}

// ONE piece row for every list of pieces (Front Door canvas 3b, PRD §6.1/§7.2): the Wardrobe's
// Owned and Wishlist, a look's Rack, the Shop to come. Its own lifted white card (`shadow-row`),
// the photo flush left at 52 wide, the category (and a look's role) in small caps, the serif name
// on one line and the brand under it, then the meta, any action and ›. The whole card opens the
// piece through a stretched link; the actions sit above it. `lines` carries a row's quiet extras.
// The native twin is CardRow in mobile/src/features/wardrobe/PieceCard.tsx.
export function CardRow({
  piece,
  thumb,
  role,
  maker,
  dashed = false,
  meta,
  action,
  lines,
  below,
  href,
  openLabel,
  highlight = false,
  swipe,
}: {
  piece: Omit<CardPiece, 'id'>;
  thumb: ReactNode;
  // A look's role for the piece, after the category in the small caps.
  role?: string;
  // The line under the name; the brand unless the row says otherwise (a find's retailer).
  maker?: string;
  dashed?: boolean;
  meta?: RowMeta | null;
  action?: ReactNode;
  lines?: ReactNode;
  // A second line of the card under its face, from the text column on (a found piece's "Looks
  // like your …", Capture PRD 1c.6).
  below?: ReactNode;
  href?: string;
  openLabel?: string;
  // A row the prompt changed: the warm fill and an ink dot at its edge.
  highlight?: boolean;
  swipe?: { text?: string; label: string; onRemove: () => void };
}) {
  const name = nameWithoutBrand(piece.label, piece.brand);
  const eye = pieceEyebrow({ ...piece, brand: null });
  const eyebrow = [eye.category, role ?? ''].filter(Boolean).join(' · ');
  const under = maker ?? piece.brand?.trim() ?? '';
  const face = (
    <div
      className={`relative flex min-h-[65px] items-center gap-3 pr-3 ${highlight ? 'bg-selected' : 'bg-surface-raised'}`}
    >
      <div
        className={`flex w-[52px] shrink-0 flex-col justify-center self-stretch overflow-hidden bg-surface-sunk ${dashed ? 'border border-dashed border-selected-line' : ''}`}
      >
        {thumb}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-2.5">
        <span className="truncate font-medium font-sans text-[9px] text-ink-faint uppercase tracking-[0.18em]">
          {eyebrow}
        </span>
        <h3 className="mt-0.5 truncate font-display font-normal text-[16px] text-ink leading-[1.25]">
          {href ? (
            <Link
              href={href}
              draggable={false}
              aria-label={openLabel ?? piece.label}
              className={`after:absolute after:inset-0 ${focus}`}
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </h3>
        {under ? (
          <span className="truncate font-sans text-[11px] text-ink-faint">{under}</span>
        ) : null}
        {lines}
      </div>
      {meta ? (
        <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] text-ink-faint">
          {meta.icon ? <Icon name={meta.icon} size={12} filled={meta.icon === 'heart'} /> : null}
          {meta.text ? <span aria-hidden>{meta.text}</span> : null}
          <span className="sr-only">{meta.label}</span>
        </span>
      ) : null}
      {action ? <div className="relative z-10 flex shrink-0 items-center">{action}</div> : null}
      {href ? <Icon name="forward" size={14} className="shrink-0 text-ink-faint" /> : null}
    </div>
  );
  return (
    <div className="relative rounded-[3px] bg-surface-raised shadow-row">
      {highlight ? (
        <span
          aria-hidden
          className="absolute top-1/2 -left-1 z-10 size-2 -translate-y-1/2 rounded-pill bg-ink"
        />
      ) : null}
      <div className="overflow-hidden rounded-[3px]">
        {swipe ? (
          <SwipeRow
            {...(swipe.text ? { removeText: swipe.text } : {})}
            removeLabel={swipe.label}
            onRemove={swipe.onRemove}
          >
            {face}
          </SwipeRow>
        ) : (
          face
        )}
        {below ? (
          <div className="mr-3 ml-16 border-hairline border-t-[0.5px] pt-[9px] pb-2.5">{below}</div>
        ) : null}
      </div>
    </div>
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
  compact = false,
  onImage,
}: {
  piece: CardPiece;
  photo: ReactNode;
  status: CardStatus;
  href?: string;
  action?: ReactNode;
  // The Front Door's 3-up tile (PRD rev 3 §2.4): the photograph, the serif name on one line, the
  // meta; no eyebrow.
  compact?: boolean;
  // On the photograph (a wish's heart), bottom right.
  onImage?: ReactNode;
}) {
  const lines = cardLines({ piece, ...(href ? { href } : {}), status });
  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-soft border border-hairline bg-surface-raised hover:border-border-control">
      <div className={`relative bg-surface-raised ${compact ? 'p-1.5' : 'p-3.5'}`}>
        <div className="overflow-hidden rounded-crisp">{photo}</div>
        {onImage ? <div className="absolute right-2 bottom-2 z-10">{onImage}</div> : null}
      </div>
      {action ? <div className="absolute top-1.5 right-1.5 z-10">{action}</div> : null}
      {compact ? (
        <div className="flex flex-col gap-[2px] px-2 pt-1.5 pb-2.5">
          <h3 className="truncate font-display font-normal text-[15px] text-ink leading-[19px]">
            {href ? (
              <Link
                href={href}
                draggable={false}
                className={`after:absolute after:inset-0 ${focus}`}
              >
                {nameWithoutBrand(piece.label, piece.brand)}
              </Link>
            ) : (
              nameWithoutBrand(piece.label, piece.brand)
            )}
          </h3>
          {lines.status}
        </div>
      ) : (
        <div className="flex flex-col gap-[3px] px-3 pt-2.5 pb-3">
          {lines.eyebrow}
          {lines.name}
          {lines.status}
        </div>
      )}
    </div>
  );
}

// The filled heart on a wish (PRD rev 3 §7.2): a click lets the wish go. On a photograph it sits on
// its own white disc; on a row it stands bare in the rose, after the price (canvas 3b).
export function HeartButton({
  label,
  onClick,
  onRow = false,
}: {
  label: string;
  onClick: () => void;
  onRow?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative z-10 inline-flex items-center justify-center rounded-pill after:absolute after:-inset-2 ${
        onRow
          ? 'size-6 text-accent-warm hover:text-ink'
          : 'size-7 bg-surface-raised/90 text-ink hover:bg-surface'
      } ${focus}`}
    >
      <Icon name="heart" size={14} filled />
    </button>
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
