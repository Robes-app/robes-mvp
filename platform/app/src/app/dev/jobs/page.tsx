import { jobs as copy } from '@robes/copy';
import { Eyebrow, Heading } from '@robes/ui';
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
        <Eyebrow>{copy.dev.eyebrow}</Eyebrow>
        <Heading level={1}>{copy.dev.title}</Heading>
      </header>
      <JobConsole initialJobId={initialJobId} />
    </main>
  );
}
