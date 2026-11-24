import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { ProposalDetail } from '@/features/looks/ProposalDetail';

// A piece Robes picked for a look, opened from its row before it is on her wishlist.
export default function LookPieceScreen() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  return (
    <StackScreen>
      <ProposalDetail lookId={id} pieceKey={key} />
    </StackScreen>
  );
}
