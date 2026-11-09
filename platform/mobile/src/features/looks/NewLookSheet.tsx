import { lookbook as copy } from '@robes/copy';
import { TileSheet } from '@robes/ui-native';
import { useRouter } from 'expo-router';

// The New Look sheet (Front Door PRD rev 3 §5.5): three doors on glass — Describe and From pieces
// open the draft drawer (the latter with the piece picker up), Photo the photo flow. Twin of web
// components/looks/new-look-sheet.tsx.
export function NewLookSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const go = (href: Parameters<typeof router.push>[0]) => {
    onClose();
    router.push(href);
  };
  return (
    <TileSheet
      open={open}
      onClose={onClose}
      title={copy.newLook}
      testID="new-look-sheet"
      tiles={[
        {
          icon: 'describe',
          label: copy.newLookSheet.describe,
          onPress: () => go('/looks/draft/new'),
          testID: 'new-look-describe',
        },
        {
          icon: 'camera',
          label: copy.newLookSheet.photo,
          onPress: () => go('/looks/photo'),
          testID: 'new-look-photo',
        },
        {
          icon: 'wardrobe',
          label: copy.newLookSheet.fromPieces,
          onPress: () => go({ pathname: '/looks/draft/[id]', params: { id: 'new', pick: '1' } }),
          testID: 'new-look-pieces',
        },
      ]}
    />
  );
}
