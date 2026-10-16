import { isApiClientError } from '@robes/api-client';
import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { StyleDna } from '@robes/contracts';
import { twin } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { isTerminal, JOB_REFRESH_MS } from '@/features/looks/ideas';
import { errorMessage } from '@/lib/errors';

const DNA_KEY = queryKeys.call('me.dna.get');

// Every Style DNA write answers with the whole Style DNA; it replaces the cache at once.
export function useDnaMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const set = (data: StyleDna) => queryClient.setQueryData(DNA_KEY, data);
  // A 409 on a line write means the list is full (BRIEF_KEPT_MAX).
  const onError = (err: unknown) =>
    toast.show({
      message:
        isApiClientError(err) && err.code === 'conflict' ? twin.words.full : errorMessage(err),
    });
  return {
    update: useApiMutation('me.dna.update', { onSuccess: set, onError }),
    addLine: useApiMutation('me.dna.lines.add', { onSuccess: set, onError }),
    removeLine: useApiMutation('me.dna.lines.remove', { onSuccess: set, onError }),
    keep: useApiMutation('me.dna.observations.keep', {
      onSuccess: (data) => {
        set(data);
        toast.show({ message: twin.noticed.kept });
      },
      onError,
    }),
    dismiss: useApiMutation('me.dna.observations.dismiss', { onSuccess: set, onError }),
  };
}

// Robes reads on its own when the read is due, once per mount; polled until the job ends.
export function useBriefRead(dna: StyleDna | undefined): { reading: boolean; failed: boolean } {
  const queryClient = useQueryClient();
  const started = useRef(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const read = useApiMutation('me.dna.read', {
    onSuccess: (out) => setJobId(out.jobId),
    onError: () => setFailed(true),
  });
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS),
    },
  );
  const due = dna?.readDue === true;

  useEffect(() => {
    if (!due || started.current) return;
    started.current = true;
    read.mutate();
  }, [due, read]);

  const finished = jobId !== null && isTerminal(job.data);
  useEffect(() => {
    if (!finished) return;
    if (job.data?.status !== 'succeeded') setFailed(true);
    setJobId(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.dna.get') });
  }, [finished, job.data, queryClient]);

  return { reading: read.isPending || jobId !== null, failed };
}
