import type { PieceBox } from '@robes/contracts';
import { SCAN_FRAME_RATIO, scanCover, scanFrame, TAG_SPOTS } from '@robes/core/add-flow';
import { Text, useColor, useReducedMotion } from '@robes/ui-native';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';

export interface ScanSource {
  uri: string;
  width: number;
  height: number;
  box: PieceBox;
}

// Review's photograph (design 3a): the piece's own crop of her photo, filling a 4:5 frame, with
// the scan line sweeping it and the tags popping in one a step. No photo (a link) is a monogram.
// `scanning`: the read is still out — the line falls top to bottom, again and again, with a
// fading trail behind it (redline 01). Web twin: components/wardrobe/add/scan-photo.tsx.
export function ScanPhoto({
  source,
  monogram,
  step,
  tags,
  caption,
  alt,
  scanning = false,
}: {
  source: ScanSource | null;
  monogram: string;
  step: number;
  tags: readonly string[];
  caption: string;
  alt: string;
  scanning?: boolean;
}) {
  const [w, setW] = useState(0);
  const h = w * SCAN_FRAME_RATIO;
  const frame = scanFrame(step);
  const cover = source && w > 0 ? scanCover(source) : null;
  const img = cover
    ? { width: cover.width * w, height: cover.height * h, left: cover.left * w, top: cover.top * h }
    : null;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={alt}
      className="w-full overflow-hidden rounded-soft border border-hairline bg-surface-sunk"
      style={{ aspectRatio: 0.8 }}
    >
      {img && source ? (
        <ExpoImage
          source={{ uri: source.uri }}
          accessible={false}
          style={{ position: 'absolute', ...img }}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 64 }} tone="faint" className="font-display">
            {monogram.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {scanning && h > 0 ? (
        <ScanLine height={h} />
      ) : frame.lineVisible ? (
        <View
          aria-hidden
          pointerEvents="none"
          className="absolute inset-x-0 h-[2px] bg-accent-warm"
          style={{ top: `${frame.lineTop}%` }}
        />
      ) : null}
      {tags.map((label, i) => {
        const spot = TAG_SPOTS[i];
        if (!spot || frame.tagsShown <= i) return null;
        return (
          <View
            key={label}
            aria-hidden
            className="absolute rounded-pill bg-bg px-3 py-1"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            <Text size="caption" numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
      {frame.ready && caption ? (
        <View className="absolute inset-x-0 bottom-0 bg-bg/90 px-4 py-3">
          <Text italic numberOfLines={1}>
            {caption}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const TRAIL = 32;

// The falling line: 1pt of the warm accent under a 32pt trail that fades up to nothing.
function ScanLine({ height }: { height: number }) {
  const reduced = useReducedMotion();
  const warm = useColor('accent-warm');
  const y = useRef(new Animated.Value(-TRAIL)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(y, { toValue: height, duration: 1600, useNativeDriver: true }),
    );
    y.setValue(-TRAIL);
    loop.start();
    return () => loop.stop();
  }, [height, reduced, y]);
  return (
    <Animated.View
      aria-hidden
      testID="scan-line"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: TRAIL,
        transform: [{ translateY: y }],
      }}
    >
      {[0.04, 0.08, 0.12, 0.18].map((a) => (
        <View key={a} style={{ flex: 1, backgroundColor: warm, opacity: a }} />
      ))}
      <View style={{ height: 1, backgroundColor: warm }} />
    </Animated.View>
  );
}
