import { ui } from '@robes/copy';
import type { ReactNode } from 'react';
import { type AccessibilityState, type GestureResponderEvent, Pressable, View } from 'react-native';
import { cx } from './cx';
import { ASPECTS, type Aspect } from './Image';
import { Skeleton } from './Skeleton';

export interface CardProps {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  // A card that is a choice says so — picked, or already taken.
  accessibilityState?: AccessibilityState;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

// Beta's white card on a hairline: raised off the cream page, never a beige panel.
const base = 'overflow-hidden rounded-soft border border-hairline bg-surface-raised';

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityState,
  disabled = false,
  className,
  testID,
}: CardProps) {
  if (!onPress) {
    return (
      <View testID={testID} className={cx(base, className)}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={cx(base, className)}
    >
      {children}
    </Pressable>
  );
}

// Skeleton twin: same frame as a loaded Card with an image and two lines of text.
export function CardSkeleton({
  aspect = '4:5',
  lines = 2,
  className,
  testID,
}: {
  aspect?: Aspect;
  lines?: number;
  className?: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={ui.loading}
      accessibilityState={{ busy: true }}
      className={cx(base, className)}
    >
      <Skeleton aspectRatio={ASPECTS[aspect]} className="rounded-none" />
      <View className="gap-2 p-3">
        {Array.from({ length: lines }, (_, i) => `line-${i}`).map((id, i) => (
          <Skeleton key={id} shape="text" width={i === 0 ? '70%' : '45%'} />
        ))}
      </View>
    </View>
  );
}
