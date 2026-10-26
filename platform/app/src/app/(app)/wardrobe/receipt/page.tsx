import { wardrobe } from '@robes/copy';
import { ForwardReceipts } from '@/app/(app)/you/forward-receipts';
import { BackLink } from '@/components/back-link';

// Forward a receipt (design "Add Piece — Handoff"): her address and the three steps, no CTA.
export default function ReceiptPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <BackLink href="/wardrobe/add" label={wardrobe.add.title} />
      <ForwardReceipts door />
    </div>
  );
}
