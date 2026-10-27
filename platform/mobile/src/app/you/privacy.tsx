import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Privacy } from '@/features/you/Privacy';

export default function PrivacyScreen() {
  return (
    <StackScreen settings title={you.privacy}>
      <Privacy />
    </StackScreen>
  );
}
