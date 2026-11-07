import { Icon } from '@robes/icons/native';
import { Pressable, View } from 'react-native';
import { CloseDisc } from './Button';
import { useColor } from './color';
import { FINE_EDGE } from './scale';
import { Text } from './Text';

export interface DrawerHeaderDone {
  label: string;
  onPress: () => void;
  // 35% while there is nothing to keep yet.
  disabled?: boolean;
}

// Felix's drawer header (DraftLook): a 36pt `cream-200` × disc, the tracked title centred, a 36pt
// ink done disc with the cream check (a spacer without one). In a drawer it is 56pt over a 0.5pt
// rule; at the head of a bottom sheet (`inSheet`, NotificationsSheet) 40pt on the sheet's own
// padding, no rule. Twin of web ui drawer.tsx DrawerHeader.
export function DrawerHeader({
  title,
  onClose,
  closeLabel,
  done,
  inSheet = false,
  closeTestID,
  doneTestID,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  done: DrawerHeaderDone | null;
  inSheet?: boolean;
  closeTestID?: string;
  doneTestID?: string;
}) {
  const onInk = useColor('bg');
  return (
    <View
      className={
        inSheet
          ? 'h-10 flex-row items-center justify-between gap-3'
          : 'h-14 flex-row items-center justify-between border-hairline px-3'
      }
      style={inSheet ? undefined : { borderBottomWidth: FINE_EDGE }}
    >
      <CloseDisc
        label={closeLabel}
        onPress={onClose}
        {...(closeTestID ? { testID: closeTestID } : {})}
      />
      <Text
        accessibilityRole="header"
        size="caption"
        numberOfLines={1}
        className="flex-1 text-center uppercase text-ink-muted"
      >
        {title}
      </Text>
      {done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done.label}
          accessibilityState={{ disabled: done.disabled === true }}
          onPress={done.onPress}
          hitSlop={6}
          className="items-center justify-center rounded-pill bg-ink"
          style={{ width: 36, height: 36, opacity: done.disabled ? 0.35 : 1 }}
          testID={doneTestID}
        >
          <Icon name="check" size={15} color={onInk} />
        </Pressable>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </View>
  );
}
