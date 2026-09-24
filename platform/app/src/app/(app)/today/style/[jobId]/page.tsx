import { JobIdParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { DailyProgress } from './daily-progress';

export default async function DailyJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const parsed = JobIdParams.safeParse({ id: (await params).jobId });
  if (!parsed.success) notFound();
  return <DailyProgress jobId={parsed.data.id} />;
}
