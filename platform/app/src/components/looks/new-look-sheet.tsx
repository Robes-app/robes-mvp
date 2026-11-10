'use client';

import { lookbook as copy } from '@robes/copy';
import { TileSheet } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LookCapture } from '@/components/capture/look-capture';

// The New Look sheet (Front Door PRD rev 3 §5.5): three doors on glass — Describe and From pieces
// open the draft drawer (the latter with the piece picker up), Photo the camera that makes a draft
// from her photograph (Capture PRD 1c). Twin of native features/looks/NewLookSheet.tsx.
export function NewLookSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [capturing, setCapturing] = useState(false);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <>
      <LookCapture open={capturing} onClose={() => setCapturing(false)} />
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
            onClick: () => {
              onClose();
              setCapturing(true);
            },
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
    </>
  );
}
