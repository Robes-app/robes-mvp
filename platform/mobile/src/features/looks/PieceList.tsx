import { Icon } from '@robes/icons/native';
import { Text, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { CardRows } from '@/features/wardrobe/PieceCard';

// The garments in a look as the Front Door canvas draws them (PRD §6.1): each row its own lifted
// card (RackRowCard), 3pt apart. Under them the pill that adds from her wardrobe: the hanger and
// its words, which open the full piece picker (Annie, 27 Nov). Web twin:
// app/src/components/looks/piece-list.tsx.
export function PieceList({
  children,
  add,
  empty,
  testID,
}: {
  children: ReactNode;
  add?: { label: string; onPress: () => void };
  empty?: ReactNode;
  testID?: string;
}) {
  const ink = useColor('ink');
  return (
    <View testID={testID ?? 'piece-list'} className="gap-2.5">
      <CardRows>{children}</CardRows>
      {empty}
      {add ? (
        <Pressable
          accessibilityRole="button"
          onPress={add.onPress}
          hitSlop={6}
          testID="rack-add"
          className="flex-row items-center justify-center gap-1.5 self-center rounded-pill bg-surface-sunk px-3.5"
          style={{ height: 32 }}
        >
          <Icon name="wardrobe" size={14} color={ink} />
          <Text size="small">{add.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
