import type { Look } from '@robes/contracts';
import { Image } from '@robes/ui-native';
import { View } from 'react-native';
import { renditionUri } from '@/lib/images';

// Robes' render when there is one, else the first piece's photo, else a quiet frame.
export function LookThumb({ look, width }: { look: Look; width: number }) {
  const image = look.image ?? look.pieces.find((p) => p.piece.image)?.piece.image ?? null;
  const uri = renditionUri(image, width);
  return (
    <View style={{ width }} className="overflow-hidden rounded-[4px]">
      {uri ? (
        <Image source={uri} alt="" blurhash={image?.blurhash} recyclingKey={look.id} />
      ) : (
        <View className="w-full bg-surface-sunk" style={{ aspectRatio: 4 / 5 }} />
      )}
    </View>
  );
}
