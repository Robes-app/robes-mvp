'use client';

import { today } from '@robes/copy';
import { ErrorText, Progress } from '@robes/ui';
import { DailyLookSkeleton, DailyLookView } from '@/components/today/daily-look-view';
import { jobProgressStage } from '@/lib/looks';
import { useJob } from '@/lib/use-job';

// Streams the daily job: the draft look exists once the text stage lands (id on the job output).
export function DailyProgress({ jobId }: { jobId: string }) {
  const { job, connection } = useJob(jobId);
  const id = job?.output.dailyLookId;
  if (id) return <DailyLookView id={id} />;
  const failed =
    job?.status === 'failed' || job?.status === 'cancelled' || connection === 'unavailable';
  if (failed) {
    return <ErrorText>{today.daily.failed}</ErrorText>;
  }
  return (
    <div className="flex flex-col gap-8">
      <Progress stage={jobProgressStage(job)} />
      <DailyLookSkeleton />
    </div>
  );
}
