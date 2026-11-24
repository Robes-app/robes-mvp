import { lookbook as copy } from '@robes/copy';
import { AlertDialog } from '@robes/ui-native';
import { useLetGo } from './look-states';

// "Delete this look?" before a suggestion goes, from its card's menu (design "Suggested looks"
// 07): it leaves the Lookbook and its pieces stay off her wishlist. Removed · Undo follows.
// Web twin: components/looks/delete-suggestion.tsx.
export function DeleteSuggestion({ id, onClose }: { id: string | null; onClose: () => void }) {
  const letGo = useLetGo();
  return (
    <AlertDialog
      open={id !== null}
      title={copy.savedLook.deleteTitle}
      message={copy.suggestedLook.deleteBody}
      actions={[
        {
          label: copy.savedLook.delete,
          variant: 'danger',
          onPress: () => {
            if (id) letGo(id);
            onClose();
          },
        },
        { label: copy.savedLook.cancel, variant: 'quiet', onPress: onClose },
      ]}
      onDismiss={onClose}
      testID="delete-suggestion"
    />
  );
}
