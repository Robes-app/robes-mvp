import { ui, wardrobe } from '@robes/copy';
import { Heading, IconButton } from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { AddPiecesPanel } from '@/features/wardrobe/add/AddPiecesPanel';
import { destinationOf } from '@/features/wardrobe/add/flow';

// The Add pieces sheet (design "Add Piece — Handoff", redline 02): its own grab handle (36×4, 8pt
// from the top), then a 44pt title row — × left, the serif title centred — and the destination
// 14pt below. `?to=wishlist` opens it on the Wishlist (the + on that tab).
export default function AddPiecesSheet() {
  const router = useRouter();
  const { to } = useLocalSearchParams<{ to?: string }>();
  return (
    <View className="flex-1 bg-bg">
      <View aria-hidden className="mt-2 h-1 w-9 self-center rounded-pill bg-rule-mid" />
      <View className="h-11 flex-row items-center px-3">
        <IconButton icon="close" label={ui.close} onPress={() => router.back()} />
        <Heading size="sm" className="flex-1 text-center" style={{ fontSize: 19 }}>
          {wardrobe.add.title}
        </Heading>
        <View className="w-11" />
      </View>
      <ScrollView contentContainerClassName="px-6 pt-3.5 pb-10">
        <AddPiecesPanel initial={destinationOf(to)} />
      </ScrollView>
    </View>
  );
}
