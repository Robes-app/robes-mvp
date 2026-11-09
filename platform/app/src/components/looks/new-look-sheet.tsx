'use client';

import { lookbook as copy } from '@robes/copy';
import { TileSheet } from '@robes/ui';
import { useRouter } from 'next/navigation';

// The New Look sheet (Front Door PRD rev 3 §5.5): three doors on glass — Describe and From pieces
// open the draft drawer (the latter with the piece picker up), Photo the photo flow. Twin of
// native features/looks/NewLookSheet.tsx.
export function NewLookSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <TileSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={copy.newLook}
      tiles={[
        {
          icon: 'describe',
          label: copy.newLookSheet.describe,
          onClick: () => go('/looks/draft/new'),
          testId: 'new-look-describe',
        },
        {
          icon: 'camera',
          label: copy.newLookSheet.photo,
          onClick: () => go('/looks/new/photo'),
          testId: 'new-look-photo',
        },
        {
          icon: 'wardrobe',
          label: copy.newLookSheet.fromPieces,
          onClick: () => go('/looks/draft/new?pick=1'),
          testId: 'new-look-pieces',
        },
      ]}
    />
  );
}
