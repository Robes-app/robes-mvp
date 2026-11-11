import { Icon, type IconName } from '@robes/icons/native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { useReducedMotion } from './motion';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export interface SwitchPillProps {
  icon: IconName;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  // What a reader hears for each state, since the label alone doesn't say what the switch does
  // ("Shop is on: looks can include your wishlist and new pieces").
  hintOn: string;
  hintOff: string;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

// The 30 × 18 track, 14pt knob, 2pt in from either end.
const TRACK_W = 30;
const TRACK_H = 18;
const KNOB = 14;
const KNOB_OFF = 2;
const KNOB_ON = TRACK_W - KNOB - KNOB_OFF;
const SLIDE_MS = 150;

// The Front Door's Shop toggle (PRD rev 3 §4.6): a 28pt pill with a glyph, a label and an iOS-style
// switch. On: the rose wash on a 1pt rose edge, an ink label, the rose track, the knob right. Off:
// clear on the warm line, a faint label, the cream track, the knob left. Twin of web ui
// switch-pill.tsx; the settings rows keep their own Switch.
export function SwitchPill({
  icon,
  label,
  checked,
  onChange,
  hintOn,
  hintOff,
  disabled = false,
  className,
  testID,
}: SwitchPillProps) {
  const reduced = useReducedMotion();
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const knob = useRef(new Animated.Value(checked ? KNOB_ON : KNOB_OFF)).current;
  useEffect(() => {
    const to = checked ? KNOB_ON : KNOB_OFF;
    if (reduced) {
      knob.setValue(to);
      return;
    }
    const animation = Animated.timing(knob, {
      toValue: to,
      duration: SLIDE_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [checked, reduced, knob]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={checked ? hintOn : hintOff}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      testID={testID}
      style={{ minHeight: MIN_TOUCH, opacity: disabled ? 0.45 : 1 }}
      className={cx('justify-center', className)}
    >
      <View
        className={cx(
          'min-h-7 flex-row items-center gap-2 rounded-pill pr-[5px] pl-[11px]',
          checked ? 'border-accent-inspire bg-shop-on' : 'border-warm-line',
        )}
        style={{ borderWidth: 1 }}
      >
        <Icon name={icon} size={12} color={checked ? ink : faint} />
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.control}
          className={checked ? 'text-ink' : 'text-ink-faint'}
          style={{ fontFamily: fonts.sansRegular, fontSize: 11 }}
        >
          {label}
        </Text>
        <View
          testID={testID ? `${testID}-track` : undefined}
          className={cx(
            'justify-center rounded-pill',
            checked ? 'bg-accent-inspire' : 'bg-switch-off',
          )}
          style={{ width: TRACK_W, height: TRACK_H }}
        >
          <Animated.View
            className="rounded-pill bg-surface-raised"
            style={{ width: KNOB, height: KNOB, transform: [{ translateX: knob }] }}
          />
        </View>
      </View>
    </Pressable>
  );
}
