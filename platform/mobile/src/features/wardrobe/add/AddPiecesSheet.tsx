import { wardrobe } from '@robes/copy';
import { TileSheet } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useRef } from 'react';

const copy = wardrobe.addSheet;

// The Add your pieces sheet (Front Door PRD rev 3 §4.6, §7.4): three tiles on glass — PASTE URL
// opens the link reader, PHOTO the camera (the photograph files straight in), FROM RECEIPT the
// receipts inbox. Over the draft and, in time, over the Wardrobe (plan PR 7). Web twin:
// app/src/components/wardrobe/add/add-pieces-sheet.tsx.
export function AddPiecesSheet({
  open,
  onClose,
  onPhoto,
  receipts,
}: {
  open: boolean;
  onClose: () => void;
  // The photo tile: the parent opens the camera once the sheet has gone.
  onPhoto: () => void;
  // Receipts waiting to be reviewed, on the tile's corner.
  receipts?: number;
}) {
  const router = useRouter();
  const go = (href: Parameters<typeof router.push>[0]) => {
    onClose();
    router.push(href);
  };
  // The camera waits for the sheet to have gone (iOS refuses to present over a dismissing modal).
  const photoNext = useRef(false);
  return (
    <TileSheet
      open={open}
      onClose={onClose}
      onClosed={() => {
        if (!photoNext.current) return;
        photoNext.current = false;
        onPhoto();
      }}
      title={copy.title}
      testID="add-pieces-sheet"
      tiles={[
        {
          icon: 'link',
          label: copy.pasteUrl,
          onPress: () => go('/wardrobe/link'),
          testID: 'add-sheet-link',
        },
        {
          icon: 'camera',
          label: copy.photo,
          onPress: () => {
            photoNext.current = true;
            onClose();
          },
          testID: 'add-sheet-photo',
        },
        {
          icon: 'mail',
          label: copy.fromReceipt,
          onPress: () => go('/wardrobe/inbox'),
          ...(receipts ? { badge: receipts } : {}),
          testID: 'add-sheet-receipt',
        },
      ]}
    />
  );
}
