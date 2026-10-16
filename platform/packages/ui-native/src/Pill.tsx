import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';
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

// Selected = ink outline + ink text, never a black fill (design-system.md §5).
export function Pill({
  children,
  selected = false,
  onPress,
  disabled = false,
  className,
  testID,
}: PillProps) {
  const body = (
    <View
      className={cx(
        'min-h-9 items-center justify-center rounded-pill border px-4',
        selected ? 'border-ink bg-bg' : 'border-border-control',
        disabled && 'opacity-50',
      )}
      style={selected ? { borderWidth: 1.5 } : undefined}
    >
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
