import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { PieceDetail } from '@/features/wardrobe/PieceDetail';

export default function PieceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StackScreen>
      <PieceDetail id={id} />
    </StackScreen>
  );
}
