import { Icon } from '@robes/icons/native';
import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { haptic } from './haptics';
import { FINE_EDGE, fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface PillProps {
  children: string;
  selected?: boolean;
  // Felix's pills: md 32pt at 0 13 with 12pt text (the category pill), sm 28pt at 0 11 with 11pt
  // text (the context chip); both keep 44pt targets.
  size?: 'md' | 'sm';
  // Felix's warm fill (a kept choice), or a filter (Front Door 2b/3b, 15 Nov): `filter` is a quick
  // chip in a filter row, outlined in the warm line at rest; `option` is a choice in the Filter
  // sheet, white on the fine edge at rest. Picked, both take the one filter selection: the pale
  // sunk fill on a 1pt umber line, ink label, no check (the umber edge carries it).
  tone?: 'warm' | 'filter' | 'option';
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
// wins). A filter chip needs no check: its umber edge carries it. The web twin is ui Pill.
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
  // A filter chip is the design's own: no warm fill, no check.
  const filter = tone !== 'warm';
  const textSize = size === 'sm' ? 11 : 12;
  const body = (
    <View
      className={cx(
        'flex-row items-center justify-center gap-1.5 rounded-pill',
        size === 'sm' ? 'min-h-7 px-[11px]' : 'min-h-8 px-[13px]',
        filter && selected
          ? 'border-token-line bg-surface-sunk'
          : tone === 'filter'
            ? 'border-warm-line bg-transparent'
            : selected
              ? 'border-selected-line bg-selected'
              : 'border-rule-mid bg-surface-raised',
      )}
      // A disabled chip (a count of 0) sits back at 45%, so it reads as a value that isn't here
      // today rather than a choice she could make.
      style={{
        borderWidth: selected || tone === 'filter' ? 1 : FINE_EDGE,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {selected && !removable && !filter ? <Icon name="check" size={14} color={ink} /> : null}
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        className={tone === 'filter' && !selected ? 'text-ink-faint' : 'text-ink'}
        style={{ fontFamily: fonts.sansRegular, fontSize: textSize }}
      >
        {children}
      </Text>
      {count !== undefined ? (
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.control}
          className="text-ink-faint"
          style={{ fontFamily: fonts.sansRegular, fontSize: textSize - 1 }}
        >
          {count}
        </Text>
      ) : null}
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
      accessibilityLabel={label ?? (count === undefined ? children : `${children} ${count}`)}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={(event) => {
        haptic.selection();
        onPress(event);
      }}
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
