import { TripParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { TripView } from '@/components/trips/trip-view';
import { isFlagEnabled } from '@/server/flags';

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isFlagEnabled('trips'))) notFound();
  const parsed = TripParams.safeParse(await params);
  if (!parsed.success) notFound();
  return <TripView id={parsed.data.id} />;
}
