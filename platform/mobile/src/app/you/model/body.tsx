import { twin } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { BodyShape } from '@/features/you/BodyShape';

export default function BodyShapeScreen() {
  return (
    <StackScreen settings title={twin.twinPage.bodyShape}>
      <BodyShape />
    </StackScreen>
  );
}
