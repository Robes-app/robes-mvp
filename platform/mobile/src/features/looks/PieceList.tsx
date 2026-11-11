import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { CardRows } from '@/features/wardrobe/PieceCard';

// The garments in a look as the Front Door canvas draws them (PRD §6.1): each row its own lifted
// card (RackRowCard), 3pt apart. On a saved look the small "+ hanger" chip under the list adds a
// piece. Web twin: app/src/components/looks/piece-list.tsx.
export function PieceList({
  children,
  onAdd,
  empty,
  testID,
}: {
  children: ReactNode;
  // A saved look: the + hanger chip under the list.
  onAdd?: () => void;
  empty?: ReactNode;
  testID?: string;
}) {
  const muted = useColor('ink-muted');
  return (
    <View testID={testID ?? 'piece-list'} className="gap-2.5">
      <CardRows>{children}</CardRows>
      {empty}
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={lookbook.rack.addPiece}
          onPress={onAdd}
          hitSlop={8}
          testID="rack-add"
          className="flex-row items-center justify-center gap-1 self-center rounded-[6px] bg-surface-sunk px-2.5"
          style={{ height: 28 }}
        >
          <Icon name="plus" size={12} color={muted} />
          <Icon name="wardrobe" size={14} color={muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
