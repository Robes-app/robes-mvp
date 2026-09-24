import { wardrobe } from '@robes/copy';
import { CardSkeleton, EmptyState } from '@robes/ui';
import { PageHeader } from '@/components/page-header';
import { WardrobeSegments } from '@/components/wardrobe/wardrobe-segments';

// Inbox arrives later in M3; the segment and its shape are already in place.
export function WardrobePlaceholder({
  current,
  empty,
}: {
  current: '/wardrobe/inbox';
  empty: { title: string; body: string };
}) {
  return (
    <>
      <PageHeader title={wardrobe.title} />
      <WardrobeSegments current={current} />
      <EmptyState title={empty.title} body={empty.body} />
      <div aria-hidden className="mt-6 grid grid-cols-2 gap-4 opacity-50 md:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </>
  );
}
