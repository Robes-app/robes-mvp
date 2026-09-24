import type { Piece } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { Card, Image, Skeleton, Text } from '@robes/ui-native';
import { View } from 'react-native';
import { renditionUri } from '@/lib/images';

export function PieceCard({ piece, onPress }: { piece: Piece; onPress: () => void }) {
  const uri = renditionUri(piece.image, 180);
  const reading = piece.status === 'reading';
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={reading ? copy.reading : piece.label}
      className="flex-1"
    >
      {uri ? (
        <Image source={uri} alt="" blurhash={piece.image?.blurhash} recyclingKey={piece.id} />
      ) : (
        <Skeleton width="100%" aspectRatio={4 / 5} />
      )}
      <View className="gap-1 p-2">
        <Text size="small" numberOfLines={1}>
          {reading ? copy.newPiece : piece.label}
        </Text>
        {reading ? (
          <Text size="caption" tone="muted" numberOfLines={1}>
            {copy.reading}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
