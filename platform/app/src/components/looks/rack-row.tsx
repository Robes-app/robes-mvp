'use client';

import type { PieceImage as PieceImageData } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { nameNoBrand, type RackRow, type RowNote, theName } from '@robes/core/looks';
import { IconButton, Image, Text } from '@robes/ui';
import Link from 'next/link';
import { imageSources } from '@/lib/image';

export type RowMark = RowNote | { kind: 'added' };

// One piece on a look's rack, read like the wardrobe list (legacy fix 13): Category · Brand, the
// name without its brand, then the role and the exception. The card opens the piece.
export function RackRowCard({
  row,
  image,
  mark,
  styled,
  onSwap,
  onWish,
  onRemove,
}: {
  row: RackRow;
  image?: PieceImageData | null;
  mark?: RowMark | null;
  styled?: string | null;
  onSwap?: () => void;
  onWish?: () => void;
  onRemove?: () => void;
}) {
  const brand = row.brand?.trim() || '';
  const name = nameNoBrand(row.name, brand);
  const sources = image ? imageSources(image.renditions) : null;
  const proposal = row.proposal;
  const ctx = [
    row.role ? copy.rack.roles[row.role] : null,
    proposal ? (proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours) : null,
    proposal?.retailerHint || null,
    proposal?.pricePoint || null,
  ].filter(Boolean);
  const changed = mark !== null && mark !== undefined;
  const body = (
    <>
      <div className="w-13 shrink-0 overflow-hidden rounded-crisp">
        {sources ? (
          <Image src={sources.src} srcSet={sources.srcSet} sizes="52px" alt="" aspect="4:5" />
        ) : (
          <div
            aria-hidden
            className="flex aspect-[4/5] items-center justify-center bg-surface-sunk"
          >
            <Text size="small" tone="muted">
              {name.charAt(0)}
            </Text>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="caption" tone="muted" className="truncate uppercase tracking-wider">
          {brand ? `${row.category} · ${brand}` : row.category}
        </Text>
        <Text className="line-clamp-2 font-display text-lg">{name}</Text>
        {ctx.length ? (
          <Text size="caption" tone="faint" className="truncate">
            {ctx.join(' · ')}
          </Text>
        ) : null}
        {mark?.kind === 'was' ? (
          <Text size="caption" tone="muted">
            {copy.rack.swappedIn(theName(mark.name))}
          </Text>
        ) : mark?.kind === 'back' ? (
          <Text size="caption" tone="muted">
            {copy.rack.backIn}
          </Text>
        ) : mark?.kind === 'added' ? (
          <Text size="caption" tone="muted">
            {copy.rack.added}
          </Text>
        ) : null}
        {styled ? (
          <Text size="caption" tone="muted" italic>
            {styled}
          </Text>
        ) : null}
      </div>
    </>
  );
  return (
    <li
      data-testid={`rack-row-${row.key}`}
      className={`flex items-center gap-3 rounded-soft border px-3 py-3 ${changed ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised'}`}
    >
      {row.pieceId ? (
        <Link
          href={`/piece/${row.pieceId}`}
          aria-label={copy.rack.open(name)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      <div className="flex shrink-0 items-center">
        {proposal && onWish ? (
          <IconButton
            icon="heart"
            label={copy.rack.save(name)}
            aria-pressed={proposal.wishlisted}
            onClick={onWish}
          />
        ) : null}
        {onSwap ? <IconButton icon="swap" label={copy.rack.swap(name)} onClick={onSwap} /> : null}
        {onRemove ? (
          <IconButton icon="close" label={copy.rack.remove(name)} onClick={onRemove} />
        ) : null}
      </div>
    </li>
  );
}
