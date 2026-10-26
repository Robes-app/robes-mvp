import { wardrobe } from '@robes/copy';
import { isDestination } from '@robes/core/add-flow';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { BackLink } from '@/components/back-link';
import { Review } from '@/components/wardrobe/add/review';

// Review for a link (photos are reviewed on the Add pieces page, where they were taken): the
// Inbox entry the page read, one piece at a time, before anything files.
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; link?: string }>;
}) {
  const { to, link } = await searchParams;
  const entry = z.uuid().safeParse(link);
  if (!entry.success) notFound();
  const dest = isDestination(to) ? to : 'wardrobe';
  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/wardrobe/add?to=${dest}`} label={wardrobe.add.title} />
      <Review to={dest} link={entry.data} />
    </div>
  );
}
