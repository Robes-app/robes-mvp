'use client';

import { isApiClientError } from '@robes/api-client';
import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { StyleDna } from '@robes/contracts';
import { twin } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { errorCopy } from './error-copy';
import { useJob } from './use-job';

const DNA_KEY = queryKeys.call('me.dna.get');

// A 409 on a line write means the list is full (BRIEF_KEPT_MAX).
const dnaErrorCopy = (err: unknown): string =>
  isApiClientError(err) && err.code === 'conflict' ? twin.words.full : errorCopy(err);

// Every Style DNA write answers with the whole Style DNA; it replaces the cache at once.
export function useDnaMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const opts = {
    onSuccess: (data: StyleDna) => queryClient.setQueryData(DNA_KEY, data),
    onError: (err: unknown) => toast({ message: dnaErrorCopy(err) }),
  };
  return {
    update: useApiMutation('me.dna.update', opts),
    addLine: useApiMutation('me.dna.lines.add', opts),
    removeLine: useApiMutation('me.dna.lines.remove', opts),
    keep: useApiMutation('me.dna.observations.keep', {
      ...opts,
      onSuccess: (data: StyleDna) => {
        queryClient.setQueryData(DNA_KEY, data);
        toast({ message: twin.noticed.kept });
      },
    }),
    dismiss: useApiMutation('me.dna.observations.dismiss', opts),
  };
}

// Robes reads on its own when the read is due (once, then weekly with nothing waiting), once per
// mount; what it noticed lands on me.dna.get when the job ends.
export function useBriefRead(dna: StyleDna | undefined): { reading: boolean; failed: boolean } {
  const queryClient = useQueryClient();
  const started = useRef(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { job, connection } = useJob(jobId);
  const read = useApiMutation('me.dna.read', {
    onSuccess: (out) => setJobId(out.jobId),
    onError: () => setFailed(true),
  });
  const due = dna?.readDue === true;

  useEffect(() => {
    if (!due || started.current) return;
    started.current = true;
    read.mutate();
  }, [due, read]);

  useEffect(() => {
    const done = job && isTerminalJobStatus(job.status);
    if (!done && connection !== 'unavailable') return;
    if (job?.status !== 'succeeded') setFailed(true);
    setJobId(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.dna.get') });
  }, [job, connection, queryClient]);

  return { reading: read.isPending || jobId !== null, failed };
}
