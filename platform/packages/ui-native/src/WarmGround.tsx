import { palette } from '@robes/tokens';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useUniwind } from 'uniwind';

// The sign-in ground (design "Sign in and sign up", 18 Nov): CSS's linear-gradient(165deg,
// cream-200 0%, cream 48%, rose-mid 130%). Rose-mid is mauve at 0.6 and its stop lies past the
// foot, so at the foot it is 0.6 × (100 − 48) / (130 − 48) ≈ 0.38. Dark mode keeps the plain
// ground. Web twin: .warm-ground in app/src/app/globals.css.
const ROSE_AT_FOOT = 0.38;

export function WarmGround() {
  const { theme } = useUniwind();
  if (theme === 'dark') return null;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="wg-base" x1="0.37" y1="0" x2="0.63" y2="1">
          <Stop offset="0" stopColor={palette.cream200} />
          <Stop offset="0.48" stopColor={palette.cream50} />
        </LinearGradient>
        <LinearGradient id="wg-rose" x1="0.37" y1="0" x2="0.63" y2="1">
          <Stop offset="0.48" stopColor={palette.mauve} stopOpacity={0} />
          <Stop offset="1" stopColor={palette.mauve} stopOpacity={ROSE_AT_FOOT} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#wg-base)" />
      <Rect width="100%" height="100%" fill="url(#wg-rose)" />
    </Svg>
  );
}
