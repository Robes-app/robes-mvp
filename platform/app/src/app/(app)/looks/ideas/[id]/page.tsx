import { IdeaParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { IdeaView } from '@/components/looks/idea-view';

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = IdeaParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <IdeaView ideaId={parsed.data.id} />
    </div>
  );
}
