import { palette } from '@robes/tokens';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useUniwind } from 'uniwind';

// The sign-in ground: cream warming to blush (legacy signup.html). Dark mode keeps the plain ground.
export function WarmGround() {
  const { theme } = useUniwind();
  if (theme === 'dark') return null;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="wg-base" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.cream300} />
          <Stop offset="0.5" stopColor={palette.cream200} />
          <Stop offset="1" stopColor={palette.blush} />
        </LinearGradient>
        <RadialGradient id="wg-a" cx="0.18" cy="0.3" rx="0.6" ry="0.5">
          <Stop offset="0" stopColor={palette.mauve} stopOpacity={0.55} />
          <Stop offset="0.7" stopColor={palette.mauve} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="wg-b" cx="0.82" cy="0.68" rx="0.55" ry="0.45">
          <Stop offset="0" stopColor={palette.blush} stopOpacity={0.5} />
          <Stop offset="0.7" stopColor={palette.blush} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#wg-base)" />
      <Rect width="100%" height="100%" fill="url(#wg-a)" />
      <Rect width="100%" height="100%" fill="url(#wg-b)" />
    </Svg>
  );
}
