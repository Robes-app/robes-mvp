import { ui, wardrobe } from '@robes/copy';
import { Heading, IconButton } from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { AddPiecesPanel } from '@/features/wardrobe/add/AddPiecesPanel';
import { destinationOf } from '@/features/wardrobe/add/flow';

// The Add pieces sheet (design "Add Piece — Handoff"): a bottom sheet with its grab bar, × and
// serif title. `?to=wishlist` opens it on the Wishlist (the + on that tab).
export default function AddPiecesSheet() {
  const router = useRouter();
  const { to } = useLocalSearchParams<{ to?: string }>();
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-2">
        <Heading size="md" style={{ fontSize: 30 }}>
          {wardrobe.add.title}
        </Heading>
        <IconButton icon="close" label={ui.close} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerClassName="px-6 pb-10">
        <AddPiecesPanel initial={destinationOf(to)} />
      </ScrollView>
    </View>
  );
}
