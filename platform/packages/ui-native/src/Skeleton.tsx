import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';
import { cx } from './cx';
import { useReducedMotion } from './motion';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  shape?: 'rect' | 'text' | 'circle';
  className?: string;
  testID?: string;
}

const shapeClass = { rect: 'rounded-soft', text: 'rounded-crisp', circle: 'rounded-pill' } as const;

// Decorative: the container that owns the skeleton announces the loading state.
export function Skeleton({
  width,
  height,
  aspectRatio,
  shape = 'rect',
  className,
  testID,
}: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [reduced, opacity]);

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cx('bg-surface-sunk', shapeClass[shape], className)}
      style={{
        width,
        height: height ?? (shape === 'text' ? 14 : undefined),
        aspectRatio,
        opacity,
      }}
    />
  );
}
