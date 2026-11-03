import { wardrobe } from '@robes/copy';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { FormSheetScreen } from '@/components/FormSheetScreen';
import { AddPiecesPanel } from '@/features/wardrobe/add/AddPiecesPanel';
import { destinationOf } from '@/features/wardrobe/add/flow';

// The Add pieces sheet (design "Add Piece — Handoff", redline 02): the destination 14pt under the
// head. `?to=wishlist` opens it on the Wishlist (the + on that tab).
export default function AddPiecesSheet() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  return (
    <FormSheetScreen title={wardrobe.add.title}>
      <ScrollView contentContainerClassName="px-6 pt-3.5 pb-6">
        <AddPiecesPanel initial={destinationOf(to)} />
      </ScrollView>
    </FormSheetScreen>
  );
}
