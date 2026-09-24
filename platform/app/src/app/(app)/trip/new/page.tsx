import { trips } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { TripForm } from './trip-form';

export default function NewTripPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={trips.create.eyebrow} title={trips.create.title} />
      <TripForm />
    </div>
  );
}
