import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Idea, IdeaList, JobSnapshot } from '@robes/contracts';
import { useQueryClient } from '@tanstack/react-query';

// No SSE on native yet (the stream needs the session cookie header); the job row is the durable
// truth, so polling it is correct, just less instant.
export const JOB_REFRESH_MS = 1500;
const IDEAS_LIMIT = 60;

const TERMINAL = new Set<JobSnapshot['status']>(['succeeded', 'partial', 'failed', 'cancelled']);
export const isTerminal = (job: JobSnapshot | undefined): boolean =>
  job !== undefined && TERMINAL.has(job.status);

export const framesSettled = (idea: Idea | undefined): boolean =>
  idea !== undefined && idea.frames.length > 0 && idea.frames.every((f) => f.status !== 'pending');

export function useIdeas(
  refetchInterval: number | false | ((data: IdeaList | undefined) => number | false) = false,
) {
  return useApi(
    'looks.ideas.list',
    { input: { limit: IDEAS_LIMIT } },
    {
      refetchInterval:
        typeof refetchInterval === 'function'
          ? (q) => refetchInterval(q.state.data)
          : refetchInterval,
    },
  );
}

// The idea a styling job produced: appears after its text stage, frames fill in after images.
export function useJobIdea(jobId: string) {
  const job = useApi(
    'jobs.get',
    { params: { id: jobId } },
    { refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS) },
  );
  const failed = job.data?.status === 'failed' || job.data?.status === 'cancelled';
  const done = (list: IdeaList | undefined): boolean =>
    failed || (isTerminal(job.data) && framesSettled(list?.items.find((i) => i.jobId === jobId)));
  const ideas = useIdeas((list) => (done(list) ? false : JOB_REFRESH_MS));
  const idea = ideas.data?.items.find((i) => i.jobId === jobId);
  const waiting = !done(ideas.data);
  return { job, ideas, idea, waiting, failed };
}

export function useSaveIdea() {
  const queryClient = useQueryClient();
  return useApiMutation('looks.ideas.save', {
    onSuccess: async (idea) => {
      queryClient.setQueryData(
        queryKeys.call('looks.ideas.get', { params: { id: idea.id } }),
        idea,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.ideas.list') });
    },
  });
}

export function useRemoveIdea(onRemoved: () => void) {
  const queryClient = useQueryClient();
  return useApiMutation('looks.ideas.delete', {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.ideas.list') });
      onRemoved();
    },
  });
}
