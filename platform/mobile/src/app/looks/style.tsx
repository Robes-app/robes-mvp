import { useLocalSearchParams } from 'expo-router';
import { StackScreen } from '@/components/StackScreen';
import { StylePiece } from '@/features/looks/StylePiece';

export default function StyleRoute() {
  const { pieceId } = useLocalSearchParams<{ pieceId?: string }>();
  return (
    <StackScreen>
      <StylePiece initialPieceId={pieceId} />
    </StackScreen>
  );
}
