import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { DeleteAccount } from '@/features/you/DeleteAccount';

export default function DeleteAccountScreen() {
  return (
    <StackScreen settings title={you.deletion.title}>
      <DeleteAccount />
    </StackScreen>
  );
}
