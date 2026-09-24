import { jobs as copy } from '@robes/copy';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { env } from '@/server/env';
import { requireProfile } from '@/server/session';
import { JobConsole } from './job-console';

// Platform smoke test UI; exists only in local dev.
export default async function DevJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  if (env.APP_ENV !== 'dev') notFound();
  await requireProfile();
  const { job } = await searchParams;
  const initialJobId = z.uuid().safeParse(job).data ?? null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">
          {copy.dev.eyebrow}
        </p>
        <h1 className="font-display text-4xl font-light text-ink">{copy.dev.title}</h1>
      </header>
      <JobConsole initialJobId={initialJobId} />
    </main>
  );
}
