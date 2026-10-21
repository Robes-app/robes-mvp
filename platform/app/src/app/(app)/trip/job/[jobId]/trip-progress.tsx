'use client';

import { trips } from '@robes/copy';
import { ErrorText, Heading, Progress } from '@robes/ui';
import { TripSkeleton, TripView } from '@/components/trips/trip-view';
import { jobProgressStage } from '@/lib/looks';
import { useJob } from '@/lib/use-job';

// Streams the travel job; the trip exists once the text stage lands (id on the job output).
export function TripProgress({ jobId }: { jobId: string }) {
  const { job, connection } = useJob(jobId);
  const id = job?.output.tripId;
  if (id) return <TripView id={id} />;
  const failed =
    job?.status === 'failed' || job?.status === 'cancelled' || connection === 'unavailable';
  if (failed) {
    return <ErrorText>{trips.progress.failed}</ErrorText>;
  }
  return (
    <div className="flex flex-col gap-8">
      <Heading level={1} size="xl">
        {trips.progress.title}
      </Heading>
      <Progress stage={jobProgressStage(job)} />
      <TripSkeleton />
    </div>
  );
}
