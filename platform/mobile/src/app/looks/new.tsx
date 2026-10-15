import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { Composer } from '@/features/looks/Composer';

export default function NewLookRoute() {
  const { pieceId } = useLocalSearchParams<{ pieceId?: string }>();
  return (
    <StackScreen>
      <Composer {...(pieceId ? { pieceId } : {})} />
    </StackScreen>
  );
}
