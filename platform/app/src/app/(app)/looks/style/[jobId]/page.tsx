import { JobIdParams } from '@robes/contracts';
import { nav } from '@robes/copy';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/back-link';
import { StyleProgress } from './style-progress';

export default async function StyleJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const parsed = JobIdParams.safeParse({ id: (await params).jobId });
  if (!parsed.success) notFound();
  const home = (await searchParams).from === 'home';
  return (
    <div className="flex flex-col gap-4">
      {home ? <BackLink href="/" label={nav.today} /> : null}
      <StyleProgress jobId={parsed.data.id} home={home} />
    </div>
  );
}
