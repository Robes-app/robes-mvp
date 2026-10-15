import { trips } from '@robes/copy';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { isFlagEnabled } from '@/server/flags';
import { TripForm } from './trip-form';

export default async function NewTripPage() {
  if (!(await isFlagEnabled('trips'))) notFound();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={trips.create.eyebrow} title={trips.create.title} />
      <TripForm />
    </div>
  );
}
