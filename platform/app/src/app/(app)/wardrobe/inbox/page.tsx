import { wardrobe } from '@robes/copy';
import { Heading } from '@robes/ui';
import { Inbox } from '@/components/wardrobe/inbox';

// The Inbox left Wardrobe's switcher (Native parity handoff): a pushed page, reached from the
// dashed row while something waits, with its own small title; the way back to Wardrobe is in the top bar (lib/nav backFor).
// The native twin is mobile/src/app/wardrobe/inbox.tsx.
export default function InboxPage() {
  return (
    <div className="flex flex-col gap-5">
      <Heading level={1} size="sm">
        {wardrobe.segments.inbox}
      </Heading>
      <Inbox />
    </div>
  );
}
