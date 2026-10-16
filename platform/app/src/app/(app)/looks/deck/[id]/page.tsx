import { LookSetParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { Deck } from '@/components/looks/deck';

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = LookSetParams.safeParse(await params);
  if (!parsed.success) notFound();
  return <Deck setId={parsed.data.id} />;
}
