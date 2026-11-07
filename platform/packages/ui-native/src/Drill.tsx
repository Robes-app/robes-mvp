import { Icon } from '@robes/icons/native';
import type { ReactNode } from 'react';
import { type AccessibilityRole, Pressable, View } from 'react-native';
import { useColor } from './color';
import { FINE_EDGE, MIN_TOUCH, typeStyle } from './scale';
import { Text } from './Text';

// Felix's drill list (LookDetails, SettingsView): one `white` card on a 0.5pt `rule-mid` edge,
// 48pt rows divided by `hairline` rules. Every list of drill rows is this card; the wardrobe piece
// adopts it next. Twin of web ui drill.tsx.
export function DrillList({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View
      testID={testID}
      className="overflow-hidden rounded-soft border-rule-mid bg-surface-raised"
      style={{ borderWidth: FINE_EDGE }}
    >
      {children}
    </View>
  );
}

export interface DrillRowProps {
  label: string;
  // The summary at the right: her answer, or what an empty row reads ("None", "Not worn yet").
  value?: string;
  // `ink-faint` for an empty or quiet summary; `ink-soft` otherwise.
  muted?: boolean;
  // A summary drawn rather than written (the seasons' glyphs); `value` still names it to a reader.
  children?: ReactNode;
  // In place of the chevron: the caption's pencil, an external glyph; `null` for none.
  trailing?: ReactNode;
  // Without it the row only reads (no chevron, not a control).
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  // The card's first row carries no rule above it.
  first?: boolean;
  testID?: string;
}

// A row: the 9pt tracked label in `ink-soft`, the 11pt summary at the right, the 14pt `ink-faint`
// chevron.
export function DrillRow({
  label,
  value,
  muted = false,
  children,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityRole = 'button',
  first = false,
  testID,
}: DrillRowProps) {
  const faint = useColor('ink-faint');
  const body = (
    <>
      <Text className="text-ink-muted" style={typeStyle('label')}>
        {label}
      </Text>
      <View className="flex-1 flex-row items-center justify-end gap-3">
        {children ??
          (value ? (
            <Text
              numberOfLines={1}
              className={muted ? 'text-ink-faint' : 'text-ink-muted'}
              style={{ fontSize: 11 }}
            >
              {value}
            </Text>
          ) : null)}
      </View>
      {trailing === undefined ? (
        onPress ? (
          <Icon name="forward" size={14} color={faint} />
        ) : null
      ) : (
        trailing
      )}
    </>
  );
  const className = 'flex-row items-center gap-3 border-hairline pr-3 pl-4';
  const style = { height: 48, minHeight: MIN_TOUCH, borderTopWidth: first ? 0 : FINE_EDGE };
  if (!onPress) {
    return (
      <View testID={testID} className={className} style={style}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? (value ? `${label} · ${value}` : label)}
      onPress={onPress}
      testID={testID}
      className={className}
      style={style}
    >
      {body}
    </Pressable>
  );
}
