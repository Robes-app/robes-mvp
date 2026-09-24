'use client';

import { useApiClient } from '@robes/api-client/react';
import { openEvents } from '@robes/api-client/sse';
import { JOB_EVENT, type JobSnapshot } from '@robes/contracts';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useEffect, useState } from 'react';

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

// Live job progress over SSE (UX-05/UX-10: no polling). Every event is a full snapshot, so a
// reconnect or a page refresh resumes from the row's latest stage.
export function useJob(jobId: string | null): JobState {
  const api = useApiClient();
  const [state, setState] = useState<JobState>({ job: null, connection: 'idle' });

  useEffect(() => {
    if (!jobId) {
      setState({ job: null, connection: 'idle' });
      return;
    }
    setState({ job: null, connection: 'connecting' });
    const stream = openEvents(api, 'jobs.events', {
      params: { id: jobId },
      on: {
        [JOB_EVENT]: (job) => {
          const done = isTerminalJobStatus(job.status);
          // Close before the server ends the stream, or EventSource would reconnect.
          if (done) stream.close();
          setState({ job, connection: done ? 'closed' : 'open' });
        },
      },
      // EventSource retries dropped streams itself; closed means the server answered with an error.
      onError: ({ closed }) =>
        setState((s) => ({ ...s, connection: closed ? 'unavailable' : 'reconnecting' })),
    });
    return () => stream.close();
  }, [api, jobId]);

  return state;
}
