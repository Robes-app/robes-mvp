import { useApi } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import { Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { DeleteSuggestion } from './DeleteSuggestion';
import { SuggestedTile } from './LookTiles';
import { useSaveLook } from './look-states';

// The piece page's "Robes suggested" rail (legacy F11): the looks styled around this piece,
// each the suggested card (Save look · Delete look on its long press). Nothing renders when there
// are none.
export function SuggestedRail({ pieceId }: { pieceId: string }) {
  const router = useRouter();
  const save = useSaveLook(undefined, 'suggested');
  const [deleting, setDeleting] = useState<string | null>(null);
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
              onPress={() => router.push(`/look/${item.id}`)}
              onSave={() => save.mutate({ params: { id: item.id }, input: {} })}
              onDelete={() => setDeleting(item.id)}
            />
          </View>
        )}
      />
      <DeleteSuggestion id={deleting} onClose={() => setDeleting(null)} />
    </View>
  );
}
