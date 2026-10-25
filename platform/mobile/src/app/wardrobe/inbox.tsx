import { wardrobe as copy } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { InboxView } from '@/features/wardrobe/InboxView';

// Wardrobe › Inbox, pushed from the "N pieces to check" row (no longer a permanent tab).
export default function InboxRoute() {
  return (
    <StackScreen title={copy.segments.inbox}>
      <InboxView />
    </StackScreen>
  );
}
