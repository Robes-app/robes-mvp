import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { Account } from '@/features/you/Account';

export default function AccountScreen() {
  return (
    <StackScreen title={you.account.title}>
      <Account />
    </StackScreen>
  );
}
