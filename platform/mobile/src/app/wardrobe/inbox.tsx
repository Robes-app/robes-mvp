import { wardrobe as copy } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { InboxView } from '@/features/wardrobe/InboxView';

// Wardrobe › Inbox (forwarded receipts), pushed from the receipt notice on Wardrobe.
export default function InboxRoute() {
  return (
    <StackScreen title={copy.segments.inbox}>
      <InboxView />
    </StackScreen>
  );
}
