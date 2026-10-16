import { useApi } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import { Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { SuggestedTile } from './LookTiles';
import { useLetGo, useRestyle } from './look-states';

// The piece page's "Robes suggested" rail (legacy F11): the looks styled around this piece,
// with ✕ and ↻ and no corner mark (the piece is the page). Nothing renders when there are none.
export function SuggestedRail({ pieceId }: { pieceId: string }) {
  const router = useRouter();
  const restyle = useRestyle();
  const letGo = useLetGo();
  const { data } = useApi('looks.list', {
    input: { limit: 12, status: 'suggested', anchorPieceId: pieceId },
  });
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <View className="gap-2" testID="suggested-rail">
      <Text size="caption" tone="muted">
        {copy.pieceRail}
      </Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(l) => l.id}
        contentContainerClassName="gap-3"
        renderItem={({ item }) => (
          <View style={{ width: 160 }}>
            <SuggestedTile
              look={item}
              showMark={false}
              onPress={() => router.push(`/look/${item.id}`)}
              onRemove={() => letGo(item.id)}
              onSwap={() => restyle.restyle(item.id)}
              swapping={restyle.busyId === item.id}
            />
          </View>
        )}
      />
    </View>
  );
}
