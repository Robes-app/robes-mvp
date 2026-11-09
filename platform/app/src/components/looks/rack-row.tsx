'use client';

import type { PieceImage as PieceImageData } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { nameNoBrand, type RackRow, type RowNote, theName } from '@robes/core/looks';
import { pieceEyebrow } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import { IconButton, Image, Text } from '@robes/ui';
import Link from 'next/link';
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

// One piece on a look's rack, drawn as the Front Door canvas's row (PRD §6.1): its own lifted white
// card, the photo flush left at 52 wide, then the category (and the piece's role) in small caps,
// the serif name on one line and the brand under it; at the right the wears behind a calendar, or
// a piece to find's price behind a bag, then ›. At rest the card opens the piece; in pencil mode
// the hanger swaps it and × takes it off (plan R2), and ♡ saves a piece to find. A row the prompt
// changed reads warm with an ink dot at its edge. The native twin is
// mobile/src/features/looks/RackRow.tsx.
export function RackRowCard({
  row,
  image,
  mark,
  styled,
  wears,
  onSwap,
  onWish,
  onRemove,
}: {
  row: RackRow;
  image?: PieceImageData | null;
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
  const eye = pieceEyebrow({
    category: row.category,
    categoryL2: row.categoryL2 ?? null,
    brand: null,
  });
  const eyebrow = [eye.category, row.role ? copy.rack.roles[row.role] : '']
    .filter(Boolean)
    .join(' · ');
  // A piece to find names where it's from when it has no brand.
  const maker = brand || proposal?.retailerHint?.trim() || '';
  const price = proposal?.pricePoint?.trim() || '';
  const changed = mark !== null && mark !== undefined;
  const markText =
    mark?.kind === 'was'
      ? copy.rack.swappedIn(theName(mark.name))
      : mark?.kind === 'back'
        ? copy.rack.backIn
        : mark?.kind === 'added'
          ? copy.rack.added
          : null;
  const resting = !onSwap && !onRemove;
  const body = (
    <>
      <div
        className={`flex w-[52px] shrink-0 flex-col justify-center self-stretch overflow-hidden bg-surface-sunk ${proposal ? 'border border-dashed border-selected-line' : ''}`}
      >
        {sources ? (
          <Image src={sources.src} srcSet={sources.srcSet} sizes="52px" alt="" aspect="4:5" />
        ) : (
          <div aria-hidden className="flex aspect-[4/5] items-center justify-center">
            <Text size="small" tone="muted">
              {name.charAt(0)}
            </Text>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-2.5">
        <span className="truncate font-medium font-sans text-[9px] text-ink-faint uppercase tracking-[0.18em]">
          {eyebrow}
        </span>
        <h3 className="mt-0.5 truncate font-display font-normal text-[16px] text-ink leading-[1.25]">
          {name}
        </h3>
        {maker ? (
          <span className="truncate font-sans text-[11px] text-ink-faint">{maker}</span>
        ) : null}
        {markText ? (
          <span className="truncate font-sans text-[11px] text-ink-muted">{markText}</span>
        ) : null}
        {styled ? (
          <span className="truncate font-sans text-[11px] text-ink-muted italic">{styled}</span>
        ) : null}
      </div>
      {proposal ? (
        <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] text-ink-faint">
          <Icon name="bag" size={12} />
          {price ? <span aria-hidden>{price}</span> : null}
          <span className="sr-only">
            {[proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours, price]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      ) : wears !== undefined ? (
        <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] text-ink-faint">
          <Icon name="calendar" size={12} />
          <span aria-hidden>{wears}</span>
          <span className="sr-only">{copy.meta.wears(wears)}</span>
        </span>
      ) : null}
    </>
  );
  return (
    <li
      data-testid={`rack-row-${row.key}`}
      className={`relative rounded-[3px] shadow-row ${changed ? 'bg-selected' : 'bg-surface-raised'}`}
    >
      {changed ? (
        <span
          aria-hidden
          className="absolute top-1/2 -left-1 z-10 size-2 -translate-y-1/2 rounded-pill bg-ink"
        />
      ) : null}
      <div className="flex min-h-[65px] items-center gap-3 overflow-hidden rounded-[3px] pr-3">
        {row.pieceId && resting ? (
          <Link
            href={`/piece/${row.pieceId}`}
            aria-label={copy.rack.open(name)}
            className="flex min-w-0 flex-1 items-center gap-3 self-stretch rounded-[3px] focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {body}
            <Icon name="forward" size={14} className="shrink-0 text-ink-faint" />
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3 self-stretch">{body}</div>
        )}
        {(proposal && onWish) || onSwap || onRemove ? (
          <div className="-mr-1.5 flex shrink-0 items-center gap-1">
            {proposal && onWish ? (
              <IconButton
                icon="heart"
                label={copy.rack.save(name)}
                aria-pressed={proposal.wishlisted}
                onClick={onWish}
              />
            ) : null}
            {onSwap ? <Disc icon="wardrobe" label={copy.rack.swap(name)} onClick={onSwap} /> : null}
            {onRemove ? (
              <Disc icon="close" label={copy.rack.remove(name)} onClick={onRemove} />
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
