import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { FINE_EDGE, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

// Felix's PieceList: the garments in a look as one `white` list on a 0.5pt `rule-mid` edge, rows
// divided by 0.5pt rules (each row is a RackRowCard). In edit mode the list takes the top corners
// and the dashed add row hangs underneath. Web twin: app/src/components/looks/piece-list.tsx.
export function PieceList({
  children,
  onAdd,
  empty,
  testID,
}: {
  children: ReactNode;
  // Edit mode: the dashed + row under the list.
  onAdd?: () => void;
  empty?: ReactNode;
  testID?: string;
}) {
  const muted = useColor('ink-muted');
  return (
    <View testID={testID ?? 'piece-list'}>
      <View
        className={`overflow-hidden border-rule-mid bg-surface-raised ${onAdd ? 'rounded-t-soft' : 'rounded-soft'}`}
        style={{ borderWidth: FINE_EDGE }}
      >
        {children}
      </View>
      {empty}
      {onAdd ? (
        <View
          className="items-center border-border-control py-2.5"
          style={{
            borderLeftWidth: FINE_EDGE,
            borderRightWidth: FINE_EDGE,
            borderBottomWidth: 1,
            borderStyle: 'dashed',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lookbook.rack.addPiece}
            onPress={onAdd}
            hitSlop={8}
            className="items-center justify-center rounded-pill bg-surface-sunk"
            style={{ width: 28, height: 28 }}
          >
            <Icon name="plus" size={13} color={muted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
