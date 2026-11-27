'use client';

import type { Piece, PieceImage as PieceImageData } from '@robes/contracts';
import { lookbook as copy, ui } from '@robes/copy';
import { nameNoBrand, type RackRow, rowKind } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/web';
import { IconButton, Image } from '@robes/ui';
import type { ReactNode } from 'react';
import { CardRow, type RowMeta } from '@/components/wardrobe/piece-card';
import { NoPhoto } from '@/components/wardrobe/piece-image';
import { pieceSources } from '@/lib/image';

const found = copy.draftLook.capture;

// A row's one control: a 32px `cream-200` disc with its glyph, in a 44px hit area. `plus` marks
// the hanger that files a found piece.
function Disc({
  icon,
  label,
  plus = false,
  onClick,
  testId,
}: {
  icon: IconName;
  label: string;
  plus?: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      data-testid={testId}
      className="flex size-11 items-center justify-center rounded-pill focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <span className="relative flex size-8 items-center justify-center rounded-pill bg-surface-sunk text-ink">
        <Icon name={icon} size={15} />
        {plus ? <Icon name="plus" size={8} className="absolute top-[3px] right-[3px]" /> : null}
      </span>
    </button>
  );
}

// A Shop piece (one Robes proposes new, not a wish or a found piece) reads "{brand} · Shop" in
// every context (docked prompt PRD W6); a piece found in her photograph says so; anything else
// its brand, or a find's retailer. Native twin: RackRow.tsx makerOf.
function makerOf(row: RackRow, brand: string): string {
  const p = row.proposal;
  if (p?.capture) return found.card.eyebrow;
  const maker = brand || p?.retailerHint?.trim() || '';
  return p && !p.wishlisted && maker ? copy.rack.shop(maker) : maker;
}

// Her piece a found row looks like, under the row's hairline (decision 13, Annie 27 Nov): the
// tick makes the match, × says it is not that piece, on this look.
export interface RowSuggestion {
  piece: Piece;
  onMatch: () => void;
  onDismiss: () => void;
}

function LooksLike({ suggestion }: { suggestion: RowSuggestion }) {
  const { piece } = suggestion;
  const image = pieceSources(piece.image);
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-[35px] w-7 shrink-0 overflow-hidden rounded-[2px] bg-surface-sunk">
        {image ? <Image sizes="28px" alt="" aspect="4:5" {...image} /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-sans text-[10.5px] text-ink-faint">{found.row.looksLike}</span>
        <span className="truncate font-sans text-[12.5px] text-ink">{piece.label}</span>
      </span>
      <span className="-my-1.5 -mr-1.5 flex items-center">
        <Disc
          icon="check"
          label={found.row.quick}
          onClick={suggestion.onMatch}
          testId="capture-quick-match"
        />
        <Disc
          icon="close"
          label={ui.dismiss}
          onClick={suggestion.onDismiss}
          testId="capture-dismiss"
        />
      </span>
    </div>
  );
}

// One piece on a look's rack (Annie, 27 Nov): the shared piece row (CardRow, PRD §6.1). The row
// opens the piece's own page; a swipe (Remove on focus) takes it off this look; and at the right
// is the one control its kind takes (`rowKind`): the hanger swaps a piece she owns; a piece found
// in her photograph has the heart that saves it to her wishlist and the hanger + that opens its
// sheet; a wish reads its price behind its heart; a piece Robes proposes its price and a heart. A
// dashed thumbnail is not hers yet. A row the prompt changed reads warm with an ink dot at its
// edge. The native twin is mobile/src/features/looks/RackRow.tsx.
export function RackRowCard({
  row,
  image,
  thumb,
  highlight = false,
  href,
  onSwap,
  onFile,
  onWish,
  onRemove,
  suggestion,
}: {
  row: RackRow;
  image?: PieceImageData | null;
  // The photograph, when the row draws its own (a found piece's crop from her photo).
  thumb?: ReactNode;
  highlight?: boolean;
  // The piece's own page: hers, her wish, or the piece as the look holds it.
  href?: string;
  // The hanger on a piece she owns: the picker, to swap it.
  onSwap?: () => void;
  // The hanger + on a found piece: its sheet.
  onFile?: () => void;
  // The heart on a piece that is not hers yet.
  onWish?: () => void;
  // The swipe: off this look, never out of her wardrobe.
  onRemove?: () => void;
  suggestion?: RowSuggestion | null;
}) {
  const brand = row.brand?.trim() || '';
  const name = nameNoBrand(row.name, brand);
  const sources = pieceSources(image);
  const kind = rowKind(row);
  const heart =
    onWish && (kind === 'found' || kind === 'shop') ? (
      <IconButton
        icon="heart"
        label={copy.rack.save(name)}
        aria-pressed={false}
        onClick={onWish}
        data-testid="rack-wish"
      />
    ) : null;
  const disc =
    kind === 'owned' && onSwap ? (
      <Disc icon="wardrobe" label={copy.rack.swap(name)} onClick={onSwap} testId="rack-swap" />
    ) : kind === 'found' && onFile ? (
      <Disc icon="wardrobe" plus label={found.row.add} onClick={onFile} testId="rack-file" />
    ) : null;
  return (
    <li data-testid={`${kind === 'found' ? 'capture' : 'rack'}-row-${row.key}`}>
      <CardRow
        piece={{
          label: name,
          category: row.category,
          categoryL2: row.categoryL2 ?? null,
          brand: brand || null,
        }}
        thumb={
          thumb ??
          (sources ? (
            <Image sizes="52px" alt="" aspect="4:5" {...sources} />
          ) : (
            <NoPhoto className="aspect-[4/5]" size={18} />
          ))
        }
        maker={makerOf(row, brand)}
        dashed={kind !== 'owned'}
        meta={rackMeta(row)}
        action={
          heart || disc ? (
            <div className="-mr-1.5 flex items-center gap-1">
              {heart}
              {disc}
            </div>
          ) : null
        }
        below={kind === 'found' && suggestion ? <LooksLike suggestion={suggestion} /> : null}
        {...(href ? { href } : {})}
        openLabel={copy.rack.open(name)}
        highlight={highlight}
        {...(onRemove ? { swipe: { label: copy.rack.remove(name), onRemove } } : {})}
      />
    </li>
  );
}

// The rack row's meta (PRD §6.1, Annie 9 Nov): a wish carries its heart and its price, a piece
// Robes proposes a bag and its price. A piece she owns or one from her photograph has none.
function rackMeta(row: RackRow): RowMeta | null {
  const proposal = row.proposal;
  if (!proposal || proposal.capture) return null;
  const price = proposal.pricePoint?.trim() || '';
  const said = proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours;
  return {
    icon: proposal.wishlisted ? 'heart' : 'shop',
    ...(price ? { text: price } : {}),
    label: [said, price].filter(Boolean).join(' · '),
  };
}
