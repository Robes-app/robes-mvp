import type { PieceBox } from '@robes/contracts';
import { cropRegion } from '@robes/core/photo-pieces';
import { Image as ExpoImage } from 'expo-image';
import { View } from 'react-native';

// Her photograph as a screen holds it locally: where it is, and its size.
export interface ReadPhoto {
  uri: string;
  width: number;
  height: number;
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
