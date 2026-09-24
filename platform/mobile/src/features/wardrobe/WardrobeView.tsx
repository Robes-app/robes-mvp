import { wardrobe as copy, nav, shell, ui } from '@robes/copy';
import {
  Button,
  CardSkeleton,
  EmptyState,
  PrimaryScope,
  SegmentedControl,
  useToast,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { useAddPieces } from './add-pieces';
import { PieceCard } from './PieceCard';
import { usePieces } from './pieces';

type Segment = 'pieces' | 'wishlist' | 'inbox';
const SEGMENTS = [
  { value: 'pieces', label: copy.segments.pieces },
  { value: 'wishlist', label: copy.segments.wishlist },
  { value: 'inbox', label: copy.segments.inbox },
] as const;

function Pieces() {
  const router = useRouter();
  const toast = useToast();
  const { pieces, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage } =
    usePieces();
  const { add, busy } = useAddPieces();

  async function addFromLibrary() {
    const result = await add('library');
    if (result.status === 'denied' || result.status === 'failed')
      toast.show({ message: result.message });
  }

  if (isPending) {
    return (
      <View
        className="flex-row gap-3 px-6"
        accessibilityLabel={copy.title}
        accessibilityState={{ busy: true }}
      >
        <CardSkeleton className="flex-1" />
        <CardSkeleton className="flex-1" />
      </View>
    );
  }
  if (isError) {
    return (
      <EmptyState
        title={errorMessage(error)}
        action={{ label: ui.retry, onPress: () => void refetch() }}
      />
    );
  }
  return (
    <FlatList
      data={pieces}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperClassName="gap-3"
      contentContainerClassName="gap-3 px-6 pb-8"
      renderItem={({ item }) => (
        <View className="flex-1">
          <PieceCard piece={item} onPress={() => router.push(`/piece/${item.id}`)} />
        </View>
      )}
      onEndReachedThreshold={0.5}
      onEndReached={() => (hasNextPage ? void fetchNextPage() : undefined)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      ListHeaderComponent={
        pieces.length > 0 ? (
          <View className="items-start pb-2">
            <Button icon="plus" onPress={addFromLibrary} loading={busy} loadingLabel={ui.loading}>
              {copy.addPieces}
            </Button>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <PrimaryScope>
          <View className="items-center gap-2">
            <EmptyState title={copy.empty.title} body={copy.empty.body} />
            <Button icon="plus" onPress={addFromLibrary} loading={busy} loadingLabel={ui.loading}>
              {copy.choosePhotos}
            </Button>
          </View>
        </PrimaryScope>
      }
    />
  );
}

export function WardrobeView() {
  const [segment, setSegment] = useState<Segment>('pieces');
  return (
    <TabScreen title={nav.wardrobe}>
      <View className="px-6 pb-3">
        <SegmentedControl
          label={copy.title}
          options={SEGMENTS}
          value={segment}
          onChange={setSegment}
        />
      </View>
      {segment === 'pieces' ? (
        <Pieces />
      ) : (
        <EmptyState title={shell.soon.title} body={shell.soon.body} />
      )}
    </TabScreen>
  );
}
