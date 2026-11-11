import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface FilterButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  // How many sheet-only filters are on. 0 leaves the button at rest.
  count?: number;
  label?: string;
  className?: string;
  testID?: string;
}

// The Front Door's Filter button (PRD rev 3 §2.5): a 28pt pill with the sliders glyph, clear on a
// 1pt `warm-line` edge at rest; once the sheet has filters on, an ink fill with the cream label
// and the count at 70% ("Filter 2"). It opens the FilterSheet. Twin of web ui filter-button.tsx.
export function FilterButton({
  onPress,
  count = 0,
  label = ui.filter,
  className,
  testID,
}: FilterButtonProps) {
  const active = count > 0;
  const ink = useColor('ink');
  const onInk = useColor('bg');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? `${label} ${count}` : label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      testID={testID}
      style={{ minHeight: MIN_TOUCH }}
      className={cx('justify-center', className)}
    >
      <View
        className={cx(
          'min-h-7 flex-row items-center gap-1.5 rounded-pill px-[11px]',
          active ? 'border-ink bg-ink' : 'border-warm-line',
        )}
        style={{ borderWidth: 1 }}
      >
        <Icon name="sliders" size={12} color={active ? onInk : ink} />
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.control}
          className={active ? 'text-bg' : 'text-ink'}
          style={{ fontFamily: fonts.sansRegular, fontSize: 11 }}
        >
          {label}
        </Text>
        {active ? (
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.control}
            className="text-bg"
            style={{ fontFamily: fonts.sansRegular, fontSize: 10, opacity: 0.7 }}
          >
            {count}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
