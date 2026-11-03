import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { NewDraft } from '@/features/looks/DraftPage';

export default function NewLookRoute() {
  const { pieceId } = useLocalSearchParams<{ pieceId?: string }>();
  return (
    <StackScreen>
      <NewDraft {...(pieceId ? { pieceId } : {})} />
    </StackScreen>
  );
}
