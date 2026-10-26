import { PieceParams } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/back-link';
import { PieceDetail } from './piece-detail';

export default async function PiecePage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = PieceParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wardrobe" label={wardrobe.piece.back} />
      <PieceDetail id={parsed.data.id} />
    </div>
  );
}
