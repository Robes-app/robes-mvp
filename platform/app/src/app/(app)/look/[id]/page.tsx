import { LookParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { LookView } from './look-view';

export default async function LookPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = LookParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <LookView id={parsed.data.id} />
    </div>
  );
}
