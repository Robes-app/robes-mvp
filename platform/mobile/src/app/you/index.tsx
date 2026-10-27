import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { YouMenu } from '@/features/you/YouMenu';

export default function YouMenuScreen() {
  return (
    <StackScreen title={you.settings}>
      <YouMenu />
    </StackScreen>
  );
}
