import { you } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { ForwardReceipts } from '@/features/you/ForwardReceipts';

export default function ReceiptsScreen() {
  return (
    <StackScreen title={you.receipts.title}>
      <ForwardReceipts />
    </StackScreen>
  );
}
