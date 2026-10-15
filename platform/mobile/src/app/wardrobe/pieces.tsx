import { StackScreen } from '@/components/StackScreen';
import { WardrobePieces } from '@/features/photo-pieces/WardrobePieces';

export default function SeveralPiecesRoute() {
  return (
    <StackScreen>
      <WardrobePieces />
    </StackScreen>
  );
}
