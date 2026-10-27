import { twin } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Model } from '@/features/you/Model';

export default function ModelScreen() {
  return (
    <StackScreen settings title={twin.twinPage.title}>
      <Model />
    </StackScreen>
  );
}
