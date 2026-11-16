import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { cx } from './cx';

// The veils Felix lays over a photograph or the screen: cream glass at the tokens' alphas.
export type GlassTone = 'veil' | 'veil-soft' | 'veil-mid' | 'veil-paper';

const FALLBACK: Record<GlassTone, string> = {
  veil: 'bg-veil',
  'veil-soft': 'bg-veil-soft',
  'veil-mid': 'bg-veil-mid',
  'veil-paper': 'bg-veil-paper',
};

// Read once: both checks are about the build and the device, not the moment.
const NATIVE_GLASS =
  Platform.OS === 'ios' &&
  (() => {
    try {
      return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
    } catch {
      return false;
    }
  })();

function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then(
      (value) => live && setReduced(value),
      () => {},
    );
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

// Liquid Glass where iOS draws it (iOS 26 on a build that has it, Reduce Transparency off);
// elsewhere the token's cream veil, as before. A view like any other: give it the shape (rounded-pill,
// a size) and its children sit on the glass. `solid` is the veil to fall back to when transparency is
// reduced or glass is missing — the opaque `bg` for a sheet that holds controls (Filter, Add pieces).
export function useNativeGlass(): boolean {
  const reduced = useReduceTransparency();
  return NATIVE_GLASS && !reduced;
}

export interface GlassProps extends ViewProps {
  tone?: GlassTone;
  // Where glass is unavailable: the veil (default) or the opaque cream ground.
  fallback?: 'veil' | 'solid';
  className?: string;
}

export function Glass({
  tone = 'veil',
  fallback = 'veil',
  className,
  style,
  children,
  ...rest
}: GlassProps) {
  const glass = useNativeGlass();
  if (!glass) {
    return (
      <View
        {...rest}
        className={cx(fallback === 'solid' ? 'bg-bg' : FALLBACK[tone], className)}
        style={style}
      >
        {children}
      </View>
    );
  }
  return (
    <View {...rest} className={cx('overflow-hidden', className)} style={style}>
      <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  );
}
