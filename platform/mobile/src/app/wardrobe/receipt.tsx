import { wardrobe } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { ForwardReceipts } from '@/features/you/ForwardReceipts';

// Forward a receipt, from Add pieces: the address card and the three steps, nothing else.
export default function ReceiptDoorRoute() {
  return (
    <StackScreen title={wardrobe.add.doors.receipt}>
      <ForwardReceipts door />
    </StackScreen>
  );
}
