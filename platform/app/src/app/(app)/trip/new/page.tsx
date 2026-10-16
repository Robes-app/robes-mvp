import { trips } from '@robes/copy';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { isFlagEnabled } from '@/server/flags';
import { TripForm } from './trip-form';

// `brief`: her words from the home box, when they read as a trip.
export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ brief?: string | string[] }>;
}) {
  if (!(await isFlagEnabled('trips'))) notFound();
  const { brief } = await searchParams;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={trips.create.eyebrow} title={trips.create.title} />
      <TripForm initialBrief={typeof brief === 'string' ? brief.slice(0, 500) : ''} />
    </div>
  );
}
