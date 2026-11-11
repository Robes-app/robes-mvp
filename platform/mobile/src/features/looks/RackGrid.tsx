import type { PieceImage } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { nameNoBrand, type RackRow } from '@robes/core/looks';
import { View } from 'react-native';
import { CardTile } from '@/features/wardrobe/PieceCard';

// The Rack as 3-up tiles (Front Door PRD rev 3 §4.6, §6.1 — the grid side of the toggle): each
// row as the wardrobe's compact tile, a proposal reading its price or Not yours yet. The list side
// is PieceList + RackRowCard. Web twin: app/src/components/looks/rack-grid.tsx.
export function RackGrid({
  rows,
  imageOf,
  onOpen,
}: {
  rows: readonly RackRow[];
  imageOf: (row: RackRow) => PieceImage | null | undefined;
  onOpen?: (row: RackRow) => void;
}) {
  return (
    <View className="-mx-1 flex-row flex-wrap" accessibilityLabel={lookbook.draftLook.rack}>
      {rows.map((row) => {
        const brand = row.brand?.trim() || '';
        const proposal = row.proposal;
        const status = proposal
          ? {
              text:
                proposal.pricePoint.trim() ||
                (proposal.wishlisted ? lookbook.rack.wishlist : lookbook.rack.notYours),
              warm: true,
            }
          : { text: row.role ? lookbook.rack.roles[row.role] : '', warm: false };
        return (
          <View key={row.key} style={{ width: '33.333%' }} className="p-1">
            <CardTile
              piece={{
                id: row.key,
                label: nameNoBrand(row.name, brand),
                category: row.category,
                categoryL2: row.categoryL2 ?? null,
                brand: brand || null,
                image: imageOf(row) ?? null,
              }}
              status={status}
              compact
              {...(onOpen ? { onOpen: () => onOpen(row) } : {})}
            />
          </View>
        );
      })}
    </View>
  );
}
