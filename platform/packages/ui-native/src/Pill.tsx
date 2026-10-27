import { Icon } from '@robes/icons/native';
import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface PillProps {
  children: string;
  selected?: boolean;
  // sm: 12pt text for dense walls (brands, icons); still a 44pt target.
  size?: 'md' | 'sm';
  // A kept name she can let go: × after the label instead of the check.
  removable?: boolean;
  // What a reader hears, when the label alone doesn't say what a tap does ("Remove Lemaire").
  label?: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

// Selected is warm, never black or white: the warm fill on the warm line with ink text and a check
// (design-system.md §5; the web twin is ui Pill). Unselected, the label is the cue, so the edge is
// the fine rule-mid.
export function Pill({
  children,
  selected = false,
  size = 'md',
  removable = false,
  label,
  onPress,
  disabled = false,
  className,
  testID,
}: PillProps) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const body = (
    <View
      className={cx(
        'min-h-9 flex-row items-center justify-center gap-1.5 rounded-pill border',
        size === 'sm' ? 'px-3.5' : 'px-4',
        selected ? 'border-selected-line bg-selected' : 'border-rule-mid bg-surface-raised',
        disabled && 'opacity-50',
      )}
      style={selected ? { borderWidth: 1.5 } : undefined}
    >
      {selected && !removable ? <Icon name="check" size={14} color={ink} /> : null}
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        className={cx(
          size === 'sm' ? 'text-xs' : 'text-sm',
          selected ? 'text-ink' : 'text-ink-muted',
        )}
        style={{ fontFamily: selected ? fonts.sansMedium : fonts.sans }}
      >
        {children}
      </Text>
      {removable ? <Icon name="close" size={12} color={muted} /> : null}
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
      accessibilityLabel={label ?? children}
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
