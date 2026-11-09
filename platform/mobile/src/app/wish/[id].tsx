import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { WishDetail } from '@/features/wardrobe/WishDetail';

// A wish's page (Front Door PRD rev 3 §7.3): the piece's anatomy, Bought where Delete sits.
export default function WishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <WishDetail id={id} />
    </StackScreen>
  );
}
