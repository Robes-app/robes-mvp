import { Icon } from '@robes/icons/native';
import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface PillProps {
  children: string;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

// Selected is raised, never black: white on the warm line with ink text and a check
// (design-system.md §5; the web twin is ui Pill). Unselected, the label is the cue, so the edge is
// the fine rule-mid.
export function Pill({
  children,
  selected = false,
  onPress,
  disabled = false,
  className,
  testID,
}: PillProps) {
  const ink = useColor('ink');
  const body = (
    <View
      className={cx(
        'min-h-9 flex-row items-center justify-center gap-1.5 rounded-pill border px-4',
        selected ? 'border-selected-line bg-selected' : 'border-rule-mid bg-surface-raised',
        disabled && 'opacity-50',
      )}
      style={selected ? { borderWidth: 1.5 } : undefined}
    >
      {selected ? <Icon name="check" size={14} color={ink} /> : null}
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        className={cx('text-sm', selected ? 'text-ink' : 'text-ink-muted')}
        style={{ fontFamily: selected ? fonts.sansMedium : fonts.sans }}
      >
        {children}
      </Text>
    </View>
  );
  if (!onPress) {
    return (
      <View testID={testID} className={className}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{ minHeight: MIN_TOUCH }}
      className={cx('justify-center', className)}
    >
      {body}
    </Pressable>
  );
}

export const Chip = Pill;
export type ChipProps = PillProps;
