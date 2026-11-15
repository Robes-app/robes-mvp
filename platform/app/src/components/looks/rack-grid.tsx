'use client';

import type { PieceImage } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { nameNoBrand, type RackRow } from '@robes/core/looks';
import Link from 'next/link';
import { PieceImage as Photo } from '@/components/wardrobe/piece-image';

// The Rack as small photographs (Robes MVP, the draft and saved look's grid side of the toggle):
// five across, each piece's picture alone at 3:4 on an 8px corner with the row's lift, no name or
// meta beneath (Annie, 15 Nov: not the wardrobe's tall card); the name is its accessible label.
// The list side is PieceList + RackRowCard. Native twin: mobile/src/features/looks/RackGrid.tsx.
export function RackGrid({
  rows,
  imageOf,
}: {
  rows: readonly RackRow[];
  imageOf: (row: RackRow) => PieceImage | null | undefined;
}) {
  return (
    <ul aria-label={lookbook.draftLook.rack} className="grid grid-cols-5 gap-x-3.5 gap-y-4 pt-1">
      {rows.map((row) => {
        const brand = row.brand?.trim() || '';
        const label = nameNoBrand(row.name, brand);
        const photo = (
          <span className="block overflow-hidden rounded-sm bg-surface-raised shadow-row">
            <Photo piece={{ label, image: imageOf(row) ?? null }} mat sizes="20vw" />
          </span>
        );
        return (
          <li key={row.key}>
            {row.pieceId ? (
              <Link
                href={`/piece/${row.pieceId}`}
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
          </li>
        );
      })}
    </ul>
  );
}
