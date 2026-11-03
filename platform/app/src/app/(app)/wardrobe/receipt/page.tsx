import { ForwardReceipts } from '@/app/(app)/you/forward-receipts';

// Forward a receipt (design "Add Piece — Handoff"): her address and the three steps, no CTA.
export default function ReceiptPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <ForwardReceipts door />
    </div>
  );
}
