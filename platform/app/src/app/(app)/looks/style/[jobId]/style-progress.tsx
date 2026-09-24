'use client';

import { queryKeys, useApi } from '@robes/api-client/react';
import { jobs } from '@robes/copy';
import { Progress, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { IdeaSkeleton, IdeaView } from '@/components/looks/idea-view';
import { jobProgressStage } from '@/lib/looks';
import { useJob } from '@/lib/use-job';

// Streams the key_piece job (UX-02): the three ways appear as soon as the text stage lands,
// then the frames fill in.
export function StyleProgress({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();
  const { job, connection } = useJob(jobId);
  const ideas = useApi('looks.ideas.list', { input: { limit: 60 } });
  const idea = ideas.data?.items.find((i) => i.jobId === jobId);

  // Each stage change can mean the idea now exists; look again.
  useEffect(() => {
    if (!job || idea) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.ideas.list') });
  }, [job?.stage, job?.status, idea, job, queryClient]);

  const failed =
    job?.status === 'failed' || job?.status === 'cancelled' || connection === 'unavailable';
  if (idea) return <IdeaView ideaId={idea.id} />;
  if (failed && !idea) {
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
