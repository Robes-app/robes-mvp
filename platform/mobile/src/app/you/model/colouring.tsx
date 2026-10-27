import { twin } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Colouring } from '@/features/you/Colouring';

export default function ColouringScreen() {
  return (
    <StackScreen settings title={twin.twinPage.colouring}>
      <Colouring />
    </StackScreen>
  );
}
