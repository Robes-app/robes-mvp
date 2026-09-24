'use client';

import { StartJobOutput } from '@robes/contracts';
import { jobs as copy } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { Button, Heading, Text } from '@robes/ui';
import { useState } from 'react';
import { useJob } from '@/lib/use-job';

export function JobConsole({ initialJobId }: { initialJobId: string | null }) {
  const [jobId, setJobId] = useState(initialJobId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { job, connection } = useJob(jobId);
  const active = job !== null && !isTerminalJobStatus(job.status);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/v1/jobs/fake', {
      method: 'POST',
      headers: { 'idempotency-key': crypto.randomUUID() },
    });
    setBusy(false);
    const started = res.ok ? StartJobOutput.safeParse(await res.json()) : null;
    if (!started?.success) return setError(copy.dev.startFailed);
    setJobId(started.data.jobId);
    // Keeps the job in the URL so a refresh resumes it.
    window.history.replaceState(null, '', `?job=${started.data.jobId}`);
  }

  async function cancel() {
    if (jobId) await fetch(`/api/v1/jobs/${jobId}/cancel`, { method: 'POST' });
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
      {error ? (
        <Text role="alert" size="small" tone="danger">
          {error}
        </Text>
      ) : null}
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
