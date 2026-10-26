'use client';

import { useApiClient } from '@robes/api-client/react';
import type { JobSnapshot } from '@robes/contracts';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useEffect, useState } from 'react';
import { followJob } from './follow-job';

// `unavailable`: the server refused the stream (signed out, or not this user's job).
export type JobConnection =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'
  | 'unavailable';

export interface JobState {
  job: JobSnapshot | null;
  connection: JobConnection;
}

// Live job progress over SSE (UX-05/UX-10), with the row read directly when the stream can't
// deliver (lib/follow-job.ts). Every event is a full snapshot, so a reconnect or a page refresh
// resumes from the row's latest stage.
export function useJob(jobId: string | null): JobState {
  const api = useApiClient();
  const [state, setState] = useState<JobState>({ job: null, connection: 'idle' });

  useEffect(() => {
    if (!jobId) {
      setState({ job: null, connection: 'idle' });
      return;
    }
    setState({ job: null, connection: 'connecting' });
    const followed = followJob(api, jobId, {
      onJob: (job) =>
        setState({ job, connection: isTerminalJobStatus(job.status) ? 'closed' : 'open' }),
      onLost: () => setState((s) => ({ ...s, connection: 'unavailable' })),
    });
    return () => followed.close();
  }, [api, jobId]);

  return state;
}
