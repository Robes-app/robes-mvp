import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Style } from '@/features/you/Style';

export default function StyleScreen() {
  return (
    <StackScreen title={you.style.title}>
      <Style />
    </StackScreen>
  );
}
