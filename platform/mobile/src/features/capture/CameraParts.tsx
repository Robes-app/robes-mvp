import { Icon, type IconName } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from '@robes/ui-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

// The parts every camera in the app is built from (Capture PRD: one viewfinder for a look, a
// piece and a photo added to a look): the chrome on the dark frame. A viewfinder is dark whatever
// the theme, so its chrome takes palette tokens, not the semantic ones that flip with the ground.
// Web twin: app/src/components/capture/camera-parts.tsx.
export const CAM_CREAM = palette.cream50;
export const CAM_INK = palette.ink900;
const WHITE = palette.white;
const VEIL = `${palette.ink900}8C`;
const DISC = `${palette.cream50}F2`;
const GUIDE = `${palette.white}E6`;

// The four corner guides around the subject (canvas 1c / 3c): 26pt, 1.5pt, a 4pt turn.
export function Brackets({
  inset = { left: 40, right: 40, top: 76, bottom: 196 },
}: {
  inset?: { left: number; right: number; top: number; bottom: number };
}) {
  const edge = { position: 'absolute', width: 26, height: 26, borderColor: GUIDE } as const;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', ...inset }}
    >
      <View
        style={{
          ...edge,
          top: 0,
          left: 0,
          borderTopWidth: 1.5,
          borderLeftWidth: 1.5,
          borderTopLeftRadius: 4,
        }}
      />
      <View
        style={{
          ...edge,
          top: 0,
          right: 0,
          borderTopWidth: 1.5,
          borderRightWidth: 1.5,
          borderTopRightRadius: 4,
        }}
      />
      <View
        style={{
          ...edge,
          bottom: 0,
          left: 0,
          borderBottomWidth: 1.5,
          borderLeftWidth: 1.5,
          borderBottomLeftRadius: 4,
        }}
      />
      <View
        style={{
          ...edge,
          bottom: 0,
          right: 0,
          borderBottomWidth: 1.5,
          borderRightWidth: 1.5,
          borderBottomRightRadius: 4,
        }}
      />
    </View>
  );
}

// A cream disc on the frame: close, back, her photos, retake. The glyph sits in a 44pt target.
export function CamDisc({
  icon,
  label,
  onPress,
  size = 40,
  disabled = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: 40 | 48;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={Math.max(0, (MIN_TOUCH - size) / 2)}
      testID={testID}
      style={{
        width: size,
        height: size,
        backgroundColor: DISC,
        opacity: disabled ? 0.5 : 1,
        shadowColor: palette.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        shadowOpacity: 0.15,
        elevation: 2,
      }}
      className="items-center justify-center rounded-pill"
    >
      <Icon name={icon} size={size === 48 ? 18 : 15} color={CAM_INK} />
    </Pressable>
  );
}

// One line on glass over the frame: the hint, the review's question, or what went wrong.
export function CamPill({ text, alert = false }: { text: string; alert?: boolean }) {
  return (
    <View
      {...(alert ? { accessibilityRole: 'alert' as const } : {})}
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: VEIL, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '92%' }}
      className="self-center rounded-pill"
    >
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        style={{ fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0.12, color: WHITE }}
        className="text-center"
      >
        {text}
      </Text>
    </View>
  );
}

// The shutter: a 78pt white ring around a white disc.
export function Shutter({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{
        width: 78,
        height: 78,
        borderWidth: 4,
        borderColor: WHITE,
        padding: 4,
        opacity: disabled ? 0.4 : 1,
      }}
      className="rounded-pill"
    >
      <View style={{ backgroundColor: WHITE }} className="flex-1 rounded-pill" />
    </Pressable>
  );
}

// The review's accept (Use photo): a 78pt ink disc inside a 4pt white ring, a ✓ on it.
export function UseDisc({
  label,
  onPress,
  disabled = false,
  busy = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{
        width: 86,
        height: 86,
        backgroundColor: WHITE,
        opacity: disabled ? 0.6 : 1,
        shadowColor: palette.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 14,
        shadowOpacity: 0.25,
        elevation: 4,
      }}
      className="items-center justify-center rounded-pill"
    >
      <View
        style={{ width: 78, height: 78, backgroundColor: CAM_INK }}
        className="items-center justify-center rounded-pill"
      >
        <Icon name="check" size={26} color={CAM_CREAM} />
      </View>
    </Pressable>
  );
}

// The review's pills (PRD 3.4): 48pt, the label caps at 9pt and 0.22em; veil cream, or ink.
export function ReviewPill({
  label,
  onPress,
  ink = false,
  disabled = false,
  busy = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  ink?: boolean;
  disabled?: boolean;
  busy?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className="flex-1 items-center justify-center rounded-pill"
      style={{
        height: 48,
        paddingHorizontal: 22,
        backgroundColor: ink ? CAM_INK : DISC,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.label}
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 9,
          letterSpacing: 2,
          color: ink ? CAM_CREAM : CAM_INK,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

// The white flash a shot plays (never a photo from her library): `at` changes with every shot.
export function Flash({ at, ms }: { at: number; ms: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!at) return;
    opacity.setValue(0.95);
    const fade = Animated.timing(opacity, { toValue: 0, duration: ms, useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [at, ms, opacity]);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: WHITE,
        opacity,
      }}
    />
  );
}
