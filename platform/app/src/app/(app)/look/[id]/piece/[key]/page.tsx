import { LookProposalParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { ProposalDetail } from '@/components/looks/proposal-detail';

// A piece Robes picked for a look, opened from its row before it is on her wishlist.
export default async function LookPiecePage({
  params,
}: {
  params: Promise<{ id: string; key: string }>;
}) {
  const parsed = LookProposalParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <ProposalDetail lookId={parsed.data.id} pieceKey={parsed.data.key} />
    </div>
  );
}
