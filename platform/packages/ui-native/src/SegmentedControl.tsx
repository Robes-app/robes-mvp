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
  // md: the tab header's track (beta .rb-seg2, 36pt); sm: the count row's grid | list toggle (32pt).
  size?: 'md' | 'sm';
  className?: string;
  testID?: string;
}

// Beta's .rb-seg2 is 36 tall; the hit area reaches 44 past it (hitSlop below).
const HEIGHT = { md: 36, sm: 32 } as const;

// The header's segmented control (legacy header audit): a cream track, a raised thumb, tracked caps.
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
  // Unselected labels read ink-faint on the track (AA), as on web.
  const muted = useColor('ink-faint');
  const height = HEIGHT[size];
  // The track is shorter than a touch target; the hit area reaches past it.
  const slop = (MIN_TOUCH - height) / 2;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      // 232 holds "SUGGESTED" on one line at 10pt tracked caps (Look redline 27 Oct: it broke).
      style={{ height, minWidth: size === 'md' ? 232 : 72 }}
      className={cx('flex-row rounded-pill border border-hairline bg-surface p-[3px]', className)}
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
                numberOfLines={1}
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
