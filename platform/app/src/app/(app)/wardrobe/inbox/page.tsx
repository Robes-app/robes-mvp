import { wardrobe } from '@robes/copy';
import { Inbox } from '@/components/wardrobe/inbox';
import { AddCircle, WardrobeHeader } from '@/components/wardrobe/wardrobe-header';

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-6">
      <WardrobeHeader
        current="/wardrobe/inbox"
        add={<AddCircle href="/wardrobe/add" label={wardrobe.header.addPiece} />}
      />
      <Inbox />
    </div>
  );
}
