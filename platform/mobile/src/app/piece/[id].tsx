import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { PieceDetail } from '@/features/wardrobe/PieceDetail';

export default function PieceScreen() {
  const { id, saw } = useLocalSearchParams<{ id: string; saw?: string }>();
  return (
    <StackScreen>
      <PieceDetail id={id} saw={saw === '1'} />
    </StackScreen>
  );
}
