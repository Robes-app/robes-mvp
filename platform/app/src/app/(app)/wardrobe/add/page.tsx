import { isDestination } from '@robes/core/add-flow';
import { AddFlow } from '@/components/wardrobe/add/add-flow';

// Add pieces (design "Add Piece — Handoff"): the sheet, the camera and Review on one page.
export default async function AddPiecesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; start?: string }>;
}) {
  const { to, start } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <AddFlow
        initial={isDestination(to) ? to : 'wardrobe'}
        start={start === 'camera' ? 'camera' : null}
      />
    </div>
  );
}
