'use client';

import { JOB_EVENT, JobSnapshot } from '@robes/contracts';
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

function parseSnapshot(data: string): JobSnapshot | null {
  try {
    return JobSnapshot.parse(JSON.parse(data));
  } catch {
    return null;
  }
}

// Live job progress over SSE (UX-05/UX-10: no polling). Every event is a full snapshot, so a
// reconnect or a page refresh resumes from the row's latest stage.
export function useJob(jobId: string | null): JobState {
  const [state, setState] = useState<JobState>({ job: null, connection: 'idle' });

  useEffect(() => {
    if (!jobId) {
      setState({ job: null, connection: 'idle' });
      return;
    }
    setState({ job: null, connection: 'connecting' });
    const source = new EventSource(`/api/v1/jobs/${encodeURIComponent(jobId)}/events`);
    source.addEventListener(JOB_EVENT, (event) => {
      const job = parseSnapshot((event as MessageEvent<string>).data);
      if (!job) return;
      const done = isTerminalJobStatus(job.status);
      // Close before the server ends the stream, or EventSource would reconnect.
      if (done) source.close();
      setState({ job, connection: done ? 'closed' : 'open' });
    });
    // EventSource retries dropped streams itself; CLOSED means the server answered with an error.
    source.onerror = () =>
      setState((s) => ({
        ...s,
        connection: source.readyState === EventSource.CLOSED ? 'unavailable' : 'reconnecting',
      }));
    return () => source.close();
  }, [jobId]);

  return state;
}
