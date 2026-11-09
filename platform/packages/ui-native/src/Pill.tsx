import { Icon } from '@robes/icons/native';
import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { FINE_EDGE, fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface PillProps {
  children: string;
  selected?: boolean;
  // Felix's pills: md 32pt at 0 13 with 12pt text (the category pill), sm 28pt at 0 11 with 11pt
  // text (the context chip); both keep 44pt targets.
  size?: 'md' | 'sm';
  // How a selected pill reads: Felix's warm fill (a kept choice), or the Front Door's deep rose
  // with a cream label (an active quick chip in a filter row, PRD rev 3 §2.5). The PRD's lighter
  // rose misses 4.5:1 under an 11pt label, so the darkened rose carries it (D1).
  tone?: 'warm' | 'rose';
  // A live count after the label, lighter ("Work 3"). A disabled chip is one whose count is 0.
  count?: number;
  // A kept name she can let go: × after the label instead of the check.
  removable?: boolean;
  // What a reader hears, when the label alone doesn't say what a tap does ("Remove Lemaire").
  label?: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

// Felix: unselected is white on the fine 0.5pt `rule-mid` with an ink label (the label is the
// cue); selected is the warm fill on a 1pt warm line. The check stays on a selected pill though
// Felix drops it: the warm fill alone is too close to white to carry the state (D1, the floor
// wins). A rose pill needs no check: its fill is unmistakable. The web twin is ui Pill.
export function Pill({
  children,
  selected = false,
  size = 'md',
  tone = 'warm',
  count,
  removable = false,
  label,
  onPress,
  disabled = false,
  className,
  testID,
}: PillProps) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const onRose = useColor('surface-raised');
  const rose = selected && tone === 'rose';
  const textSize = size === 'sm' ? 11 : 12;
  const body = (
    <View
      className={cx(
        'flex-row items-center justify-center gap-1.5 rounded-pill',
        size === 'sm' ? 'min-h-7 px-[11px]' : 'min-h-8 px-[13px]',
        rose
          ? 'border-accent-warm bg-accent-warm'
          : selected
            ? 'border-selected-line bg-selected'
            : 'border-rule-mid bg-surface-raised',
      )}
      // A disabled chip (a count of 0) sits back at 45% on the hairline, so it reads as a value
      // that isn't here today rather than a choice she could make.
      style={{ borderWidth: selected ? 1 : FINE_EDGE, opacity: disabled ? 0.45 : 1 }}
    >
      {selected && !removable && !rose ? <Icon name="check" size={14} color={ink} /> : null}
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        className={rose ? 'text-surface-raised' : 'text-ink'}
        style={{ fontFamily: fonts.sansRegular, fontSize: textSize }}
      >
        {children}
      </Text>
      {count !== undefined ? (
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.control}
          className={rose ? 'text-surface-raised' : 'text-ink-faint'}
          style={{ fontFamily: fonts.sansRegular, fontSize: textSize - 1, opacity: rose ? 0.7 : 1 }}
        >
          {count}
        </Text>
      ) : null}
      {removable ? <Icon name="close" size={12} color={rose ? onRose : muted} /> : null}
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
      accessibilityLabel={label ?? (count === undefined ? children : `${children} ${count}`)}
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
