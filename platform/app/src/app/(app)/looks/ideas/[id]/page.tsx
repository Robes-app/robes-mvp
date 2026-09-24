import { IdeaParams } from '@robes/contracts';
import { shell } from '@robes/copy';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/back-link';
import { IdeaView } from '@/components/looks/idea-view';

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = IdeaParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/looks/ideas" label={shell.segments.ideas} />
      <IdeaView ideaId={parsed.data.id} />
    </div>
  );
}
