import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Model } from '@/features/you/Model';

export default function ModelScreen() {
  return (
    <StackScreen title={you.model.link}>
      <Model />
    </StackScreen>
  );
}
