'use client';

import { wardrobe } from '@robes/copy';
import { AlertDialog } from '@robes/ui';

// "Delete this piece?" (Front Door PRD rev 3 §7.3, R14): the piece page's Delete piece and the
// wardrobe row's swipe ask the same question. The Undo toast still follows a yes.
// Native twin: mobile/src/features/wardrobe/DeletePieceDialog.tsx.
export function DeletePieceDialog({
  open,
  message = wardrobe.piece.deleteBody,
  onDelete,
  onCancel,
}: {
  open: boolean;
  // A wish leaves the wishlist only, so it says so.
  message?: string;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      title={wardrobe.piece.deleteTitle}
      message={message}
      actions={[
        { label: wardrobe.piece.deleteConfirm, variant: 'danger', onClick: onDelete },
        { label: wardrobe.piece.cancel, variant: 'quiet', onClick: onCancel },
      ]}
      onDismiss={onCancel}
    />
  );
}
