import { useReducedMotion } from '@robes/ui-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

const SWEEP_MS = 2200;

// The scanner (legacy 0.5): a rose line sweeping over the piece while its looks compose. Under
// reduced motion it stands still at the top.
export function ScanLine() {
  const reduced = useReducedMotion();
  const [height, setHeight] = useState(0);
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || height <= 2) return;
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(y, {
          toValue: height - 2,
          duration: SWEEP_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: SWEEP_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    sweep.start();
    return () => sweep.stop();
  }, [reduced, height, y]);
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      testID="scan-line"
    >
      <Animated.View
        className="h-0.5 w-full bg-accent-inspire"
        style={{ transform: [{ translateY: y }] }}
      />
    </View>
  );
}
