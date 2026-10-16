import type { PieceBox } from '@robes/contracts';
import { photoPieces as copy } from '@robes/copy';
import { boxCentre, cropRegion, nudgeTags } from '@robes/core/photo-pieces';
import { Text } from '@robes/ui-native';
import { Image as ExpoImage } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import type { ReadPhoto } from './read';

export interface FrameTag {
  index: number;
  box: PieceBox;
  label: string;
}

const TAG_H = 22;
const tagWidth = (tag: FrameTag, dots: boolean) => (dots ? TAG_H : 30 + tag.label.length * 7);

// Her photo whole, a numbered tag (or dot) on each piece still to answer, nudged clear of each other.
export function PhotoFrame({
  photo,
  tags,
  dots = false,
}: {
  photo: ReadPhoto;
  tags: readonly FrameTag[];
  dots?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const aspect = photo.width && photo.height ? photo.width / photo.height : 4 / 5;
  const height = width / aspect;
  const placed = nudgeTags(
    tags.map((t) => {
      const { cx, cy } = boxCentre(t.box);
      return { cx: cx * width, cy: cy * height, w: tagWidth(t, dots), h: TAG_H };
    }),
    width,
    height,
  );
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="w-full overflow-hidden rounded-soft bg-surface-sunk"
      style={{ aspectRatio: aspect }}
      accessibilityRole="image"
      accessibilityLabel={copy.photoAlt}
    >
      <ExpoImage
        source={{ uri: photo.uri }}
        contentFit="cover"
        accessible={false}
        style={{ width: '100%', height: '100%' }}
      />
      {tags.map((tag, i) => {
        const at = width ? placed[i] : undefined;
        const { cx, cy } = boxCentre(tag.box);
        const w = tagWidth(tag, dots);
        return (
          <View
            key={tag.index}
            accessible
            accessibilityLabel={copy.tag(tag.index + 1, tag.label)}
            testID={`photo-tag-${tag.index}`}
            className="absolute flex-row items-center gap-1 rounded-pill bg-bg px-1"
            // Percentages until the frame is measured, then the nudged positions.
            style={{
              left: at ? at.cx - w / 2 : `${cx * 100}%`,
              top: at ? at.cy - TAG_H / 2 : `${cy * 100}%`,
              height: TAG_H,
              minWidth: w,
            }}
          >
            <View className="size-4 items-center justify-center rounded-pill bg-ink">
              <Text size="caption" className="text-bg">
                {String(tag.index + 1)}
              </Text>
            </View>
            {dots ? null : (
              <Text size="caption" numberOfLines={1}>
                {tag.label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// The piece's own crop, drawn from her photo itself until the crop asset renders.
export function CropThumb({
  photo,
  box,
  size = 64,
}: {
  photo: ReadPhoto;
  box: PieceBox;
  size?: number;
}) {
  const r = cropRegion(box);
  const a = photo.width && photo.height ? (r.w * photo.width) / (r.h * photo.height) : 1;
  const regionW = a >= 1 ? size : size * a;
  const regionH = a >= 1 ? size / a : size;
  const imgW = regionW / r.w;
  const imgH = regionH / r.h;
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-soft bg-surface-sunk"
      style={{ width: size, height: size }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View className="overflow-hidden" style={{ width: regionW, height: regionH }}>
        <ExpoImage
          source={{ uri: photo.uri }}
          accessible={false}
          style={{
            position: 'absolute',
            width: imgW,
            height: imgH,
            left: -r.x * imgW,
            top: -r.y * imgH,
          }}
        />
      </View>
    </View>
  );
}
