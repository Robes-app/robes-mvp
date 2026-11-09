import { wardrobe as copy } from '@robes/copy';
import { AlertDialog } from '@robes/ui-native';

// "Delete this piece?" (Front Door PRD rev 3 §7.3, R14): the piece page's Delete piece and the
// wardrobe row's swipe ask the same question. The Undo toast still follows a yes.
// Web twin: app/src/components/wardrobe/delete-piece-dialog.tsx.
export function DeletePieceDialog({
  open,
  onDelete,
  onCancel,
}: {
  open: boolean;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      title={copy.piece.deleteTitle}
      message={copy.piece.deleteBody}
      actions={[
        { label: copy.piece.deleteConfirm, variant: 'danger', onPress: onDelete },
        { label: copy.piece.cancel, variant: 'quiet', onPress: onCancel },
      ]}
      onDismiss={onCancel}
      testID="delete-piece-confirm"
    />
  );
}
