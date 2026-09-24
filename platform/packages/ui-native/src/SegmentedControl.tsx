import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      className={cx('flex-row rounded-pill border border-border-control p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
            style={{ minHeight: MIN_TOUCH }}
            className={cx(
              'flex-1 items-center justify-center rounded-pill px-3',
              selected && 'border border-ink bg-bg',
              disabled && 'opacity-50',
            )}
          >
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.control}
              className={cx('text-sm', selected ? 'text-ink' : 'text-ink-muted')}
              style={{ fontFamily: selected ? fonts.sansMedium : fonts.sans }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
