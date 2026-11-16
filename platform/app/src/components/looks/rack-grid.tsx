'use client';

import type { PieceImage } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { nameNoBrand, type RackRow } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import Link from 'next/link';
import { PieceImage as Photo } from '@/components/wardrobe/piece-image';

const disc =
  "relative flex size-[22px] items-center justify-center rounded-pill border-[0.5px] border-rule-mid bg-veil text-ink shadow-disc after:absolute after:-inset-[11px] after:content-[''] focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

// The Rack as small photographs (Robes MVP, the draft and saved look's grid side of the toggle):
// five across, each piece's picture alone at 3:4 on an 8px corner with the row's lift, no name or
// meta beneath (Annie, 15 Nov: not the wardrobe's tall card); the name is its accessible label. At
// rest a tile opens its piece or its wish; with the pencil down (Robes MVP 2b) the tiles rock, ×
// sits on the corner and the swap at the foot. Native twin: mobile/src/features/looks/RackGrid.tsx.
export function RackGrid({
  rows,
  imageOf,
  hrefOf,
  editing,
}: {
  rows: readonly RackRow[];
  imageOf: (row: RackRow) => PieceImage | null | undefined;
  hrefOf?: (row: RackRow) => string | undefined;
  editing?: { onSwap: (row: RackRow) => void; onRemove: (row: RackRow) => void };
}) {
  return (
    <ul aria-label={lookbook.draftLook.rack} className="grid grid-cols-5 gap-x-3.5 gap-y-4 pt-1">
      {rows.map((row) => {
        const brand = row.brand?.trim() || '';
        const label = nameNoBrand(row.name, brand);
        const href = editing
          ? undefined
          : (hrefOf?.(row) ?? (row.pieceId ? `/piece/${row.pieceId}` : undefined));
        const photo = (
          <span className="block overflow-hidden rounded-sm bg-surface-raised shadow-row">
            <Photo piece={{ label, image: imageOf(row) ?? null }} mat sizes="20vw" />
          </span>
        );
        return (
          <li
            key={row.key}
            className={
              editing
                ? 'relative motion-safe:animate-[rack-jig-tile_130ms_ease-in-out_infinite_alternate]'
                : undefined
            }
          >
            {href ? (
              <Link
                href={href}
                aria-label={label}
                title={label}
                className="block rounded-sm focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                {photo}
              </Link>
            ) : (
              <span role="img" aria-label={label} title={label} className="block">
                {photo}
              </span>
            )}
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => editing.onRemove(row)}
                  aria-label={lookbook.rack.remove(label)}
                  title={lookbook.rack.remove(label)}
                  className={`${disc} absolute -top-1.5 -left-1.5 z-10`}
                >
                  <Icon name="close" size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => editing.onSwap(row)}
                  aria-label={lookbook.rack.swap(label)}
                  title={lookbook.rack.swap(label)}
                  className={`${disc} absolute -bottom-2 left-1/2 z-10 -translate-x-1/2`}
                >
                  <Icon name="wardrobe" size={11} />
                </button>
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
