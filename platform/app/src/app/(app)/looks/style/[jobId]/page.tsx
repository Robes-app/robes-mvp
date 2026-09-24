import { JobIdParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { StyleProgress } from './style-progress';

export default async function StyleJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const parsed = JobIdParams.safeParse({ id: (await params).jobId });
  if (!parsed.success) notFound();
  return <StyleProgress jobId={parsed.data.id} />;
}
