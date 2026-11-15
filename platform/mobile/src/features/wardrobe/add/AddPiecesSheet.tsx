import { useApi } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import type { AddDestination } from '@robes/core/add-flow';
import { Button, Field, PrimaryScope, TileSheet } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

const copy = wardrobe.addSheet;

// The Add pieces sheet (Front Door PRD rev 3 §4.6, §7.4): three tiles on glass — PASTE URL turns
// the sheet into Add from Link with the field inline (✓ reads the page), PHOTO the camera (over the
// draft the photograph files straight onto the look), FROM RECEIPT the Receipts with the count
// waiting on its corner. The sheet is the three tiles and nothing under them (Annie, 15 Nov, on
// the 3b reference: the quiet "Add without a photo" line made it too tall); a piece by hand is
// still there when a link can't be read. Web twin:
// app/src/components/wardrobe/add/add-pieces-sheet.tsx.
export function AddPiecesSheet({
  open,
  onClose,
  onPhoto,
  to = 'wardrobe',
  draft = false,
}: {
  open: boolean;
  onClose: () => void;
  // The photo tile over the draft: the parent opens the camera once the sheet has gone. Without
  // it the tile opens the wardrobe's camera.
  onPhoto?: () => void;
  // Where the pieces go (the Wishlist tab's + files wishes).
  to?: AddDestination;
  // Over the draft the sheet reads "Add your pieces".
  draft?: boolean;
}) {
  const router = useRouter();
  const inbox = useApi('inbox.list', undefined, { enabled: open });
  const receipts = inbox.data?.count ?? 0;
  const [link, setLink] = useState(false);
  const [url, setUrl] = useState('');
  const go = (href: Parameters<typeof router.push>[0]) => {
    onClose();
    router.push(href);
  };
  // The camera waits for the sheet to have gone (iOS refuses to present over a dismissing modal).
  const photoNext = useRef(false);
  const close = () => {
    setLink(false);
    setUrl('');
    onClose();
  };
  const read = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLink(false);
    setUrl('');
    go({ pathname: '/wardrobe/link', params: { to, url: trimmed } });
  };
  return (
    <TileSheet
      open={open}
      onClose={close}
      onClosed={() => {
        if (!photoNext.current) return;
        photoNext.current = false;
        if (onPhoto) onPhoto();
        else router.push({ pathname: '/wardrobe/camera', params: { to } });
      }}
      title={link ? copy.linkTitle : draft ? copy.draftTitle : copy.titleTo[to]}
      testID="add-pieces-sheet"
      {...(link ? { selected: copy.pasteUrl } : {})}
      tiles={[
        {
          icon: 'link',
          label: copy.pasteUrl,
          onPress: () => setLink(true),
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
          // A receipt is for pieces she bought: inactive while filing to the Wishlist.
          ...(to === 'wishlist' ? { disabled: true } : receipts ? { badge: receipts } : {}),
          testID: 'add-sheet-receipt',
        },
      ]}
    >
      {link ? (
        <PrimaryScope>
          <View className="gap-3">
            <Field
              label={copy.linkField}
              labelHidden
              autoFocus
              value={url}
              onChangeText={setUrl}
              placeholder={wardrobe.add.link.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={read}
              maxLength={2048}
              testID="add-sheet-url"
            />
            <Button
              disabled={url.trim() === ''}
              onPress={read}
              icon="check"
              testID="add-sheet-read"
            >
              {copy.linkGo}
            </Button>
          </View>
        </PrimaryScope>
      ) : null}
    </TileSheet>
  );
}
