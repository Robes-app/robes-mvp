import { Icon, type IconName } from '@robes/icons/native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { GlassSheet, type GlassSheetProps } from './Sheet';
import { FINE_EDGE, maxFontSizeMultiplier, typeStyle } from './scale';

export interface SheetTile {
  icon: IconName;
  // Authored in sentence case; the tile shows it in the label caps.
  label: string;
  onPress: () => void;
  // A count waiting behind the tile (receipts to review), on an ink disc at its corner.
  badge?: number;
  testID?: string;
}

export interface TileSheetProps extends Omit<GlassSheetProps, 'children'> {
  tiles: readonly SheetTile[];
  // The tile whose flow is open inside the sheet (Paste URL once its field shows): it takes an
  // ink outline and the others sit back at 45%.
  selected?: string;
  // What the open flow shows under the tiles: the link field, the receipts inbox.
  children?: ReactNode;
}

// The Front Door's action sheet (PRD rev 3 §2.4 "glass action sheet"): a GlassSheet with three
// tiles — a glyph over a tracked label on a white card — for New Look, Add Pieces and Add your
// pieces. Twin of web ui tile-sheet.tsx.
export function TileSheet({ tiles, selected, children, ...sheet }: TileSheetProps) {
  const ink = useColor('ink');
  const onInk = useColor('bg');
  const dimmed = selected !== undefined;
  return (
    <GlassSheet {...sheet}>
      <View className="flex-row gap-2.5">
        {tiles.map((tile) => {
          const picked = tile.label === selected;
          return (
            <Pressable
              key={tile.label}
              accessibilityRole="button"
              accessibilityLabel={
                tile.badge !== undefined ? `${tile.label}, ${tile.badge}` : tile.label
              }
              accessibilityState={{ selected: picked }}
              onPress={tile.onPress}
              testID={tile.testID}
              className={cx(
                'h-[72px] flex-1 items-center justify-center gap-2 rounded-card bg-surface-raised',
                picked ? 'border-ink' : 'border-rule-mid',
              )}
              style={{
                borderWidth: picked ? 1.5 : FINE_EDGE,
                opacity: dimmed && !picked ? 0.45 : 1,
              }}
            >
              <Icon name={tile.icon} size={18} color={ink} />
              <Text
                maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                numberOfLines={1}
                className="text-ink-muted"
                style={typeStyle('label')}
              >
                {tile.label}
              </Text>
              {tile.badge !== undefined && tile.badge > 0 ? (
                <View
                  className="absolute items-center justify-center rounded-pill bg-ink"
                  style={{ top: -6, right: -6, minWidth: 18, height: 18, paddingHorizontal: 4 }}
                >
                  <Text
                    maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                    style={{ ...typeStyle('label'), color: onInk, letterSpacing: 0 }}
                  >
                    {tile.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {children ? <View className="mt-5">{children}</View> : null}
    </GlassSheet>
  );
}
