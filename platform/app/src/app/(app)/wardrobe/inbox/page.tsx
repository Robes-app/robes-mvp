import { wardrobe } from '@robes/copy';
import { Heading } from '@robes/ui';
import { BackLink } from '@/components/back-link';
import { Inbox } from '@/components/wardrobe/inbox';

// The Inbox left Wardrobe's switcher (Native parity handoff): a pushed page, reached from the
// dashed row while something waits, with its own small title and the way back to Wardrobe.
// The native twin is mobile/src/app/wardrobe/inbox.tsx.
export default function InboxPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <BackLink href="/wardrobe" label={wardrobe.piece.back} />
        <Heading level={1} size="sm">
          {wardrobe.segments.inbox}
        </Heading>
      </div>
      <Inbox />
    </div>
  );
}
