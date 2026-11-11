import { WishParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { WishDetail } from '@/components/wardrobe/wish-detail';

// A wish's page (Front Door PRD rev 3 §7.3).
export default async function WishPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = WishParams.safeParse(await params);
  if (!parsed.success) notFound();
  return (
    <div className="flex flex-col gap-4">
      <WishDetail id={parsed.data.id} />
    </div>
  );
}
