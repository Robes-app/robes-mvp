'use client';

import type { PieceImage as PieceImageData } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { nameNoBrand, type RackRow, type RowNote, theName } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { IconButton, Image } from '@robes/ui';
import { CardRow, type RowMeta } from '@/components/wardrobe/piece-card';
import { NoPhoto } from '@/components/wardrobe/piece-image';
import { imageSources } from '@/lib/image';

export type RowMark = RowNote | { kind: 'added' };

// A row's action (swap, remove): a 32px `cream-200` disc with an `ink-soft` glyph, in a 44px hit area.
function Disc({
  icon,
  label,
  onClick,
}: {
  icon: 'wardrobe' | 'close';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center rounded-pill focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <span className="flex size-8 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted">
        <Icon name={icon} size={15} />
      </span>
    </button>
  );
}

// Edit mode's small discs (Robes MVP 2b): 22px on the bg veil with a lift, an ink glyph; the hit
// area reaches 44.
function EditDisc({
  icon,
  label,
  onClick,
  className,
}: {
  icon: 'wardrobe' | 'close';
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex size-[22px] items-center justify-center rounded-pill border-[0.5px] border-rule-mid bg-veil text-ink shadow-disc after:absolute after:-inset-[11px] after:content-[''] focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${className ?? ''}`}
    >
      <Icon name={icon} size={11} />
    </button>
  );
}

// One piece on a look's rack: the shared piece row (CardRow, PRD §6.1) with the look's own say —
// its role in the small caps, a find's retailer under the name, and at the right the wears behind a
// calendar (a piece she owns), a wish's price behind a heart, or a piece to find's price behind a
// bag. At rest the row opens the piece; in pencil mode the hanger swaps it and × takes it off
// (plan R2), and ♡ saves a piece to find. A row the prompt changed reads warm with an ink dot at
// its edge. The native twin is mobile/src/features/looks/RackRow.tsx.
export function RackRowCard({
  row,
  image,
  mark,
  styled,
  wears,
  onSwap,
  onWish,
  onRemove,
  wishHref,
  editing = false,
  wasImage,
}: {
  row: RackRow;
  image?: PieceImageData | null;
  // The photograph of the piece a change swapped out, for the Swapped pill (docked prompt T3).
  wasImage?: PieceImageData | null;
  // A wish on the rack opens its own page at rest (Annie, 15 Nov).
  wishHref?: string;
  // The Rack's pencil is down (Robes MVP 2b): the card rocks, × on its corner, swap and chevron.
  editing?: boolean;
  mark?: RowMark | null;
  styled?: string | null;
  // The piece's own wear count, on a saved look at rest (beta's ledger, L19).
  wears?: number;
  onSwap?: () => void;
  onWish?: () => void;
  onRemove?: () => void;
}) {
  const brand = row.brand?.trim() || '';
  const name = nameNoBrand(row.name, brand);
  const sources = image ? imageSources(image.renditions) : null;
  const proposal = row.proposal;
  // A swapped piece shows the Swapped pill instead (docked prompt PRD T3).
  const markText =
    mark?.kind === 'back' ? copy.rack.backIn : mark?.kind === 'added' ? copy.rack.added : null;
  const resting = !onSwap && !onRemove;
  const actions = editing ? (
    <div className="flex items-center gap-2">
      {proposal && onWish && !proposal.wishlisted ? (
        <IconButton
          icon="heart"
          label={copy.rack.save(name)}
          aria-pressed={false}
          onClick={onWish}
        />
      ) : null}
      {onSwap ? <EditDisc icon="wardrobe" label={copy.rack.swap(name)} onClick={onSwap} /> : null}
      <Icon name="forward" size={14} className="text-ink-faint" />
    </div>
  ) : (proposal && onWish) || onSwap || onRemove ? (
    <div className="-mr-1.5 flex items-center gap-1">
      {proposal && onWish ? (
        <IconButton
          icon="heart"
          label={copy.rack.save(name)}
          aria-pressed={proposal.wishlisted}
          onClick={onWish}
        />
      ) : null}
      {onSwap ? <Disc icon="wardrobe" label={copy.rack.swap(name)} onClick={onSwap} /> : null}
      {onRemove ? <Disc icon="close" label={copy.rack.remove(name)} onClick={onRemove} /> : null}
    </div>
  ) : null;
  return (
    <li
      data-testid={`rack-row-${row.key}`}
      className={
        editing
          ? 'relative motion-safe:animate-[rack-jig-row_130ms_ease-in-out_infinite_alternate]'
          : undefined
      }
    >
      {editing && onRemove ? (
        <EditDisc
          icon="close"
          label={copy.rack.remove(name)}
          onClick={onRemove}
          className="absolute -top-1.5 -left-1.5 z-20"
        />
      ) : null}
      <CardRow
        piece={{
          label: name,
          category: row.category,
          categoryL2: row.categoryL2 ?? null,
          brand: brand || null,
        }}
        thumb={
          sources ? (
            <Image src={sources.src} srcSet={sources.srcSet} sizes="52px" alt="" aspect="4:5" />
          ) : (
            <NoPhoto className="aspect-[4/5]" size={18} />
          )
        }
        {...(row.role ? { role: copy.rack.roles[row.role] } : {})}
        maker={shopMaker(row, brand)}
        dashed={!!proposal}
        meta={editing ? null : rackMeta(row, wears)}
        action={actions}
        lines={
          markText || styled || mark?.kind === 'was' ? (
            <>
              {mark?.kind === 'was' ? <SwappedPill name={mark.name} image={wasImage} /> : null}
              {markText ? (
                <span className="truncate font-sans text-[11px] text-ink-muted">{markText}</span>
              ) : null}
              {styled ? (
                <span className="truncate font-sans text-[11px] text-ink-muted italic">
                  {styled}
                </span>
              ) : null}
            </>
          ) : null
        }
        {...(resting && row.pieceId
          ? { href: `/piece/${row.pieceId}` }
          : resting && wishHref
            ? { href: wishHref }
            : {})}
        openLabel={copy.rack.open(name)}
        highlight={mark !== null && mark !== undefined}
      />
    </li>
  );
}

// A Shop piece (one Robes proposes new, not a wish or a found piece) reads "{brand} · Shop" in
// every context (docked prompt PRD W6); anything else its brand, or a find's retailer.
// Native twin: RackRow.tsx shopMaker.
function shopMaker(row: RackRow, brand: string): string {
  const p = row.proposal;
  const maker = brand || p?.retailerHint?.trim() || '';
  return p && !p.wishlisted && !p.capture && maker ? copy.rack.shop(maker) : maker;
}

// The Swapped pill under a piece a change swapped in (docked prompt PRD T3): a faded round
// thumbnail of the piece it replaced, an arrow, then "Swapped"; the full line is its label.
// Native twin: RackRow.tsx SwappedPill.
function SwappedPill({ name, image }: { name: string; image: PieceImageData | null | undefined }) {
  const sources = image ? imageSources(image.renditions) : null;
  return (
    <span
      role="img"
      aria-label={copy.rack.swappedFor(theName(name))}
      data-testid="swapped-pill"
      className="inline-flex w-fit items-center gap-1 rounded-pill bg-surface-sunk py-0.5 pr-2 pl-0.5 font-sans text-[11px] text-ink-muted"
    >
      <span className="size-4 shrink-0 overflow-hidden rounded-full opacity-50">
        {sources ? (
          <Image src={sources.src} srcSet={sources.srcSet} sizes="16px" alt="" aspect="1:1" />
        ) : (
          <NoPhoto className="size-4" size={10} />
        )}
      </span>
      <Icon name="forward" size={9} />
      {copy.rack.swapped}
    </span>
  );
}

// The rack row's meta (PRD §6.1, Annie 9 Nov): a wish carries a heart and its price, a piece to
// find a bag and its price, a piece she owns its wears.
function rackMeta(row: RackRow, wears: number | undefined): RowMeta | null {
  const proposal = row.proposal;
  if (proposal) {
    const price = proposal.pricePoint?.trim() || '';
    const said = proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours;
    return {
      icon: proposal.wishlisted ? 'heart' : 'bag',
      ...(price ? { text: price } : {}),
      label: [said, price].filter(Boolean).join(' · '),
    };
  }
  return wears === undefined
    ? null
    : { icon: 'calendar', text: String(wears), label: copy.meta.wears(wears) };
}
