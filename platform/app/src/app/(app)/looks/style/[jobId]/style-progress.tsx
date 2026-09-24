'use client';

import { jobs } from '@robes/copy';
import { Progress, Text } from '@robes/ui';
import { IdeaSkeleton, IdeaView } from '@/components/looks/idea-view';
import { jobProgressStage } from '@/lib/looks';
import { useJob } from '@/lib/use-job';

// Streams the key_piece job (UX-02): the idea exists once the text stage lands (its id rides on
// the job output), then the frames fill in on the idea page.
export function StyleProgress({ jobId }: { jobId: string }) {
  const { job, connection } = useJob(jobId);
  const ideaId = job?.output.ideaId;
  if (ideaId) return <IdeaView ideaId={ideaId} />;
  const failed =
    job?.status === 'failed' || job?.status === 'cancelled' || connection === 'unavailable';
  if (failed) {
    return (
      <Text role="alert" tone="danger">
        {jobs.status.failed}
      </Text>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <Progress stage={jobProgressStage(job)} />
      <IdeaSkeleton />
    </div>
  );
}
