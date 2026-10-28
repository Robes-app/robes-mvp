import { PieceParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { PieceDetail } from './piece-detail';

export default async function PiecePage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = PieceParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <PieceDetail id={parsed.data.id} />
    </div>
  );
}
