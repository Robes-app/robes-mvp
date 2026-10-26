import { ui } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/native';
import * as Haptics from 'expo-haptics';
import { createContext, type ReactNode, useContext, useEffect, useRef } from 'react';
import { ActivityIndicator, type GestureResponderEvent, Pressable, Text } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

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

const container: Record<ButtonVariant, string> = {
  primary: 'rounded-pill bg-ink px-6',
  secondary: 'rounded-pill border border-border-control px-6',
  quiet: 'px-1',
};

// The one primary (redline "one primary button spec"): an ink pill, 48pt, at 30% ink while it
// waits on her.
const PRIMARY_HEIGHT = 48;

const label: Record<ButtonVariant, string> = {
  primary: 'text-bg',
  secondary: 'text-ink',
  quiet: 'text-ink-muted underline',
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
  const ink = useColor(variant === 'quiet' ? 'ink-muted' : 'ink');
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
      style={{ minHeight: variant === 'primary' ? PRIMARY_HEIGHT : MIN_TOUCH }}
      className={cx(
        'flex-row items-center justify-center gap-2 py-3',
        container[variant],
        // A waiting primary stays ink at 30% (the one primary button spec); the rest dim to half.
        inactive && (variant === 'primary' ? 'opacity-30' : 'opacity-50'),
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : icon ? (
        <Icon name={icon} size={18} color={iconColor} />
      ) : null}
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        className={cx(variant === 'quiet' ? 'text-sm' : 'text-xs uppercase', label[variant])}
        style={{ fontFamily: fonts.sansMedium, letterSpacing: variant === 'quiet' ? 0 : 1.9 }}
      >
        {text}
      </Text>
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
