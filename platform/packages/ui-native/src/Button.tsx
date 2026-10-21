import { ui } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/native';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, type GestureResponderEvent, Pressable, Text } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

// Kept so screens that still wrap themselves in it compile; it no longer limits primary buttons.
export function PrimaryScope({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const container: Record<ButtonVariant, string> = {
  primary: 'rounded-pill bg-ink px-6',
  secondary: 'rounded-pill border border-border-control px-6',
  quiet: 'px-1',
};

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
      style={{ minHeight: MIN_TOUCH }}
      className={cx(
        'flex-row items-center justify-center gap-2 py-3',
        container[variant],
        inactive && 'opacity-50',
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
        className={cx('text-sm', label[variant])}
        style={{ fontFamily: fonts.sansMedium }}
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
  className?: string;
  testID?: string;
}

export function IconButton({
  icon,
  label: accessibilityLabel,
  onPress,
  disabled = false,
  tone = 'ink',
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
        disabled && 'opacity-50',
        className,
      )}
    >
      <Icon name={icon} size={24} color={color} />
    </Pressable>
  );
}
