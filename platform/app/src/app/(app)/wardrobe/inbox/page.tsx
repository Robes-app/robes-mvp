import { wardrobe } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { Inbox } from '@/components/wardrobe/inbox';
import { WardrobeSegments } from '@/components/wardrobe/wardrobe-segments';

export default function InboxPage() {
  return (
    <>
      <PageHeader title={wardrobe.title} />
      <WardrobeSegments current="/wardrobe/inbox" />
      <Inbox />
    </>
  );
}
