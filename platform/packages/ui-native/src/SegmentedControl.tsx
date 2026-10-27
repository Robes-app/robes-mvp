import { Icon, type IconName } from '@robes/icons/native';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  // Shown instead of the label (which stays the accessible name), e.g. the grid | list toggle.
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  // md: the tab header's track (beta parity canvas: 38pt segments in a 3pt sunk track = 44pt);
  // sm: the count row's small grid | list toggle (32pt).
  size?: 'md' | 'sm';
  className?: string;
  testID?: string;
}

const HEIGHT = { md: 44, sm: 32 } as const;

// The header's segmented control (legacy header audit): a sunk track, a raised thumb, tracked caps.
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  size = 'md',
  className,
  testID,
}: SegmentedControlProps<T>) {
  const ink = useColor('ink');
  // Unselected labels sit on the sunk track, where ink-muted is 4.44:1 (under AA); faint passes.
  const muted = useColor('ink-faint');
  const height = HEIGHT[size];
  // The track is shorter than a touch target; the hit area reaches past it.
  const slop = (MIN_TOUCH - height) / 2;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      style={{ height, minWidth: size === 'md' ? 213 : 72 }}
      className={cx('flex-row rounded-pill bg-surface-sunk p-[3px]', className)}
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
            hitSlop={{ top: slop, bottom: slop }}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
            className={cx(
              'flex-1 items-center justify-center rounded-pill px-3',
              selected && 'border border-selected-line bg-selected',
              disabled && 'opacity-50',
            )}
          >
            {option.icon ? (
              <Icon name={option.icon} size={14} color={selected ? ink : muted} />
            ) : (
              <Text
                maxFontSizeMultiplier={maxFontSizeMultiplier.control}
                className={cx('text-[10px] uppercase', selected ? 'text-ink' : 'text-ink-faint')}
                style={{ fontFamily: fonts.sansMedium, letterSpacing: 2.4 }}
              >
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
