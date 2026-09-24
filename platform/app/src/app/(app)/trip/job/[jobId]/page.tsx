import { JobIdParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { TripProgress } from './trip-progress';

export default async function TripJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const parsed = JobIdParams.safeParse({ id: (await params).jobId });
  if (!parsed.success) notFound();
  return <TripProgress jobId={parsed.data.id} />;
}
