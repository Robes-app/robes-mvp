import type { PieceImage } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { nameNoBrand, type RackRow } from '@robes/core/looks';
import { shadowNative } from '@robes/tokens';
import { Pressable, View } from 'react-native';
import { Photo } from '@/features/wardrobe/PieceCard';

const COLUMNS = 5;

// The Rack as small photographs (Robes MVP, the draft and saved look's grid side of the toggle):
// five across, each piece's picture alone at 3:4 on an 8pt corner with the row's lift, no name or
// meta beneath (Annie, 15 Nov: not the wardrobe's tall card). A tap opens the piece as a row does.
// The list side is PieceList + RackRowCard. Web twin: app/src/components/looks/rack-grid.tsx.
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
    <View
      className="-mx-[7px] flex-row flex-wrap pt-1"
      style={{ rowGap: 16 }}
      accessibilityLabel={lookbook.draftLook.rack}
    >
      {rows.map((row) => {
        const brand = row.brand?.trim() || '';
        const label = nameNoBrand(row.name, brand);
        const tile = (
          <View className="overflow-hidden rounded-sm bg-surface-raised" style={shadowNative.row}>
            <View className="overflow-hidden rounded-sm">
              <Photo
                piece={{
                  id: row.key,
                  label,
                  category: row.category,
                  categoryL2: row.categoryL2 ?? null,
                  brand: brand || null,
                  image: imageOf(row) ?? null,
                }}
                width={90}
                aspect="3:4"
              />
            </View>
          </View>
        );
        return (
          <View key={row.key} style={{ width: `${100 / COLUMNS}%` }} className="px-[7px]">
            {onOpen ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onOpen(row)}
                hitSlop={4}
                testID="rack-grid-tile"
              >
                {tile}
              </Pressable>
            ) : (
              <View accessible accessibilityLabel={label} testID="rack-grid-tile">
                {tile}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
