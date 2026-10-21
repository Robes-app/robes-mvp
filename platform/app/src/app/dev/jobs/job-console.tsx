'use client';

import { useApiMutation } from '@robes/api-client/react';
import { jobs as copy } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { Button, ErrorText, Heading, Text } from '@robes/ui';
import { useState } from 'react';
import { useJob } from '@/lib/use-job';

export function JobConsole({ initialJobId }: { initialJobId: string | null }) {
  const [jobId, setJobId] = useState(initialJobId);
  const { job, connection } = useJob(jobId);
  const active = job !== null && !isTerminalJobStatus(job.status);
  const startJob = useApiMutation('jobs.fake', {
    onSuccess: ({ jobId: id }) => {
      setJobId(id);
      // Keeps the job in the URL so a refresh resumes it.
      window.history.replaceState(null, '', `?job=${id}`);
    },
  });
  const cancelJob = useApiMutation('jobs.cancel');
  const busy = startJob.isPending;
  const error = startJob.isError ? copy.dev.startFailed : null;

  function start() {
    startJob.mutate();
  }

  function cancel() {
    if (jobId) cancelJob.mutate({ params: { id: jobId } });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-6">
        <Button
          variant="primary"
          onClick={start}
          disabled={active}
          loading={busy}
          loadingLabel={copy.dev.starting}
        >
          {copy.dev.start}
        </Button>
        {active ? (
          <Button variant="quiet" onClick={cancel}>
            {copy.cancel}
          </Button>
        ) : null}
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {job ? (
        <Text role="status" size="small" tone="muted">
          {connection === 'reconnecting' ? copy.connectionLost : copy.status[job.status]}
        </Text>
      ) : null}
      {job?.output.text ? (
        <article className="flex flex-col gap-3">
          <Heading level={2}>{job.output.text.title}</Heading>
          <ul className="flex flex-col gap-1 text-ink">
            {job.output.text.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
      ) : null}
      {job?.output.images ? (
        <ul aria-label={copy.imagesLabel} className="grid grid-cols-3 gap-3">
          {job.output.images.map((image) => (
            <li
              key={image.idx}
              className="flex aspect-[3/4] items-center justify-center rounded-crisp bg-surface-sunk p-2 text-center text-xs text-ink-muted"
            >
              {copy.imagePending}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
