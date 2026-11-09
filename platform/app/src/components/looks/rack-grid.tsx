'use client';

import type { PieceImage } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { nameNoBrand, type RackRow } from '@robes/core/looks';
import { CardTile } from '@/components/wardrobe/piece-card';
import { PieceImage as Photo } from '@/components/wardrobe/piece-image';

// The Rack as 3-up tiles (Front Door PRD rev 3 §4.6, §6.1 — the grid side of the toggle): each
// row as the wardrobe's compact tile, a proposal reading its price or Not yours yet. The list side
// is PieceList + RackRowCard. Native twin: mobile/src/features/looks/RackGrid.tsx.
export function RackGrid({
  rows,
  imageOf,
}: {
  rows: readonly RackRow[];
  imageOf: (row: RackRow) => PieceImage | null | undefined;
}) {
  return (
    <ul aria-label={lookbook.draftLook.rack} className="grid grid-cols-3 gap-2">
      {rows.map((row) => {
        const brand = row.brand?.trim() || '';
        const proposal = row.proposal;
        const label = nameNoBrand(row.name, brand);
        const status = proposal
          ? {
              text:
                proposal.pricePoint.trim() ||
                (proposal.wishlisted ? lookbook.rack.wishlist : lookbook.rack.notYours),
              warm: true,
            }
          : { text: row.role ? lookbook.rack.roles[row.role] : '', warm: false };
        return (
          <li key={row.key}>
            <CardTile
              piece={{
                id: row.key,
                label,
                category: row.category,
                categoryL2: row.categoryL2 ?? null,
                brand: brand || null,
              }}
              status={status}
              compact
              photo={<Photo piece={{ label, image: imageOf(row) ?? null }} mat sizes="33vw" />}
            />
          </li>
        );
      })}
    </ul>
  );
}
