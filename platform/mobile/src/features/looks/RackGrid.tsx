import type { PieceImage } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { nameNoBrand, type RackRow } from '@robes/core/looks';
import { shadowNative } from '@robes/tokens';
import { Animated, Pressable, View } from 'react-native';
import { Photo } from '@/features/wardrobe/PieceCard';
import { EditDisc, useJig } from './RackRow';

const COLUMNS = 5;

// The Rack as small photographs (Robes MVP, the draft and saved look's grid side of the toggle):
// five across, each piece's picture alone at 3:4 on an 8pt corner with the row's lift, no name or
// meta beneath (Annie, 15 Nov: not the wardrobe's tall card). A tap opens the piece as a row does.
// The list side is PieceList + RackRowCard. Web twin: app/src/components/looks/rack-grid.tsx.
export function RackGrid({
  rows,
  imageOf,
  onOpen,
  editing,
}: {
  rows: readonly RackRow[];
  imageOf: (row: RackRow) => PieceImage | null | undefined;
  onOpen?: (row: RackRow) => void;
  // The pencil is down (Robes MVP 2b): the tiles rock, × on the corner, swap at the foot.
  editing?: { onSwap: (row: RackRow) => void; onRemove: (row: RackRow) => void };
}) {
  const jig = useJig(!!editing, 1.1);
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
              <Photo piece={{ id: row.key, image: imageOf(row) ?? null }} width={90} aspect="3:4" />
            </View>
          </View>
        );
        if (editing) {
          return (
            <View key={row.key} style={{ width: `${100 / COLUMNS}%` }} className="px-[7px]">
              <Animated.View
                accessible={false}
                style={{ transform: [{ rotate: jig }] }}
                testID="rack-grid-tile"
              >
                {tile}
                <View className="absolute" style={{ left: -6, top: -6 }}>
                  <EditDisc
                    icon="close"
                    label={lookbook.rack.remove(label)}
                    onPress={() => editing.onRemove(row)}
                  />
                </View>
                <View className="absolute inset-x-0 items-center" style={{ bottom: -8 }}>
                  <EditDisc
                    icon="wardrobe"
                    label={lookbook.rack.swap(label)}
                    onPress={() => editing.onSwap(row)}
                  />
                </View>
              </Animated.View>
            </View>
          );
        }
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
