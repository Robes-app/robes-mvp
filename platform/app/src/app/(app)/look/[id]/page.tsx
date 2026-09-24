import { LookParams } from '@robes/contracts';
import { looks } from '@robes/copy';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/back-link';
import { LookView } from './look-view';

export default async function LookPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = LookParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/looks" label={looks.title} />
      <LookView id={parsed.data.id} />
    </div>
  );
}
