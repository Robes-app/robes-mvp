import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Text, useColor, useReducedMotion } from '@robes/ui-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

const SWEEP_MS = 1600;

// The scanner (legacy 0.5): a rose line sweeping over the piece while its looks compose. Under
// reduced motion it stands still at the top.
export function ScanLine() {
  const reduced = useReducedMotion();
  const rose = useColor('accent-inspire');
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
        style={{
          transform: [{ translateY: y }],
          shadowColor: rose,
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </View>
  );
}

// What a frame still being drawn says: a swap re-writes the look, else Robes is drawing it. Null
// once the frame has landed. One rule for the tile and the look's own picture.
export function scanningLine(look: Look, swapping = false): string | null {
  if (swapping) return copy.suggestedTile.restyling;
  if (look.framePending) return copy.suggestedTile.restyling;
  return !look.image && look.setId ? copy.suggestedTile.framing : null;
}

// The sweep plus its line, over the frame: a card never rests on the bare piece or prompt.
// `corner` sits it bottom-left of a large frame; the default centres it on a tile.
export function Scanning({ line, corner = false }: { line: string; corner?: boolean }) {
  return (
    <>
      <ScanLine />
      <View
        pointerEvents="none"
        className={
          corner ? 'absolute bottom-2.5 left-2.5' : 'absolute inset-0 items-center justify-center'
        }
      >
        <Text
          size="caption"
          tone="muted"
          className="rounded-pill border border-hairline bg-bg px-2.5 py-1"
        >
          {line}
        </Text>
      </View>
    </>
  );
}
