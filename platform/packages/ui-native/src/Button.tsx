import { ui } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/native';
import * as Haptics from 'expo-haptics';
import { createContext, type ReactNode, useContext, useEffect, useRef } from 'react';
import { ActivityIndicator, type GestureResponderEvent, Pressable, Text } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

// Felix's Button: `primary` (the ink pill), `outline` (white on the fine edge) and `chip` (the small
// cream pill), plus `quiet` (a text action). Twin of web ui button-styles.ts.
export type ButtonVariant = 'primary' | 'outline' | 'chip' | 'quiet';

type Scope = { primaries: number };
const globalScope: Scope = { primaries: 0 };
const PrimaryScopeContext = createContext<Scope>(globalScope);

// One filled button per screen (UX-26). Wrap each screen that stays mounted in a stack or tab.
export function PrimaryScope({ children }: { children: ReactNode }) {
  const scope = useRef<Scope>({ primaries: 0 }).current;
  return <PrimaryScopeContext.Provider value={scope}>{children}</PrimaryScopeContext.Provider>;
}

export const DOUBLE_PRIMARY_WARNING =
  '[@robes/ui-native] Two primary Buttons are mounted on one screen. Keep one filled button per screen (UX-26).';

function usePrimaryGuard(active: boolean) {
  const scope = useContext(PrimaryScopeContext);
  useEffect(() => {
    if (!active || !__DEV__) return;
    scope.primaries += 1;
    if (scope.primaries > 1) console.warn(DOUBLE_PRIMARY_WARNING);
    return () => {
      scope.primaries -= 1;
    };
  }, [active, scope]);
}

// Felix: the primary 48 tall at 0 28; the outline 40 tall at 0 20, white on a 0.5pt `rule-mid`
// edge (the label is the cue); the chip 28 tall on `surface-sunk`. Each keeps a 44pt hit area.
const container: Record<ButtonVariant, string> = {
  primary: 'rounded-pill bg-ink px-7',
  outline: 'rounded-pill border-[0.5px] border-rule-mid bg-surface-raised px-5',
  chip: 'rounded-pill bg-surface-sunk px-3',
  quiet: 'px-1',
};

const height: Record<ButtonVariant, number> = { primary: 48, outline: 40, chip: 28, quiet: 36 };

const label: Record<ButtonVariant, string> = {
  primary: 'text-bg',
  outline: 'text-ink',
  chip: 'text-ink-muted',
  quiet: 'text-ink-muted',
};

// Felix's `label` caps: 10/500 at 0.22em on the pill buttons, 9 at 0.16em on a chip; a quiet
// action is 12 in sentence case.
const labelType: Record<ButtonVariant, { fontSize: number; letterSpacing: number }> = {
  primary: { fontSize: 10, letterSpacing: 2.2 },
  outline: { fontSize: 10, letterSpacing: 2.2 },
  chip: { fontSize: 9, letterSpacing: 1.44 },
  quiet: { fontSize: 12, letterSpacing: 0 },
};

export interface ButtonProps {
  children: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: IconName;
  accessibilityHint?: string;
  className?: string;
  testID?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingLabel = ui.loading,
  icon,
  accessibilityHint,
  className,
  testID,
}: ButtonProps) {
  usePrimaryGuard(variant === 'primary');
  const onInk = useColor('bg');
  const ink = useColor(variant === 'quiet' || variant === 'chip' ? 'ink-muted' : 'ink');
  const iconColor = variant === 'primary' ? onInk : ink;
  const inactive = disabled || loading;
  const text = loading ? loadingLabel : children;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      testID={testID}
      onPress={(event) => {
        if (variant === 'primary') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress(event);
      }}
      // A control shorter than 44pt keeps its hit area through hitSlop, never a bigger glyph.
      hitSlop={Math.max(0, (MIN_TOUCH - height[variant]) / 2)}
      style={{ minHeight: height[variant] }}
      className={cx(
        'flex-row items-center justify-center gap-1.5',
        container[variant],
        // A waiting primary stays ink at 30% (the one primary button spec); the rest dim to 40%.
        inactive && (variant === 'primary' ? 'opacity-30' : 'opacity-40'),
        className,
      )}
    >
      {loading ? <ActivityIndicator size="small" color={iconColor} /> : null}
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        className={cx(variant === 'quiet' ? null : 'uppercase', label[variant])}
        style={{ fontFamily: fonts.sansMedium, ...labelType[variant] }}
      >
        {text}
      </Text>
      {/* Felix sets a button's glyph after its label, at 11pt. */}
      {icon && !loading ? <Icon name={icon} size={11} color={iconColor} /> : null}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  tone?: 'ink' | 'ink-muted';
  // The labelled round control beside a tab's switcher (the + on every tab root): a 44pt white
  // circle on the fine rule-mid edge with an 18pt glyph, rather than a bare glyph.
  framed?: boolean;
  className?: string;
  testID?: string;
}

export function IconButton({
  icon,
  label: accessibilityLabel,
  onPress,
  disabled = false,
  tone = 'ink',
  framed = false,
  className,
  testID,
}: IconButtonProps) {
  const color = useColor(tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
      className={cx(
        'items-center justify-center rounded-pill',
        framed && 'border border-rule-mid bg-surface-raised',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Icon name={icon} size={framed ? 18 : 24} color={color} />
    </Pressable>
  );
}
