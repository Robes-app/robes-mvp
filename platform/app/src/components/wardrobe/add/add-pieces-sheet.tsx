'use client';

import { wardrobe } from '@robes/copy';
import { TileSheet } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { PHOTO_ACCEPT } from '@/lib/upload';

const copy = wardrobe.addSheet;

// The Add your pieces sheet (Front Door PRD rev 3 §4.6, §7.4): three tiles on glass — PASTE URL
// opens the link reader, PHOTO the file picker (the photograph files straight in), FROM RECEIPT
// the receipts inbox. Over the draft and, in time, over the Wardrobe (plan PR 7). Native twin:
// mobile/src/features/wardrobe/add/AddPiecesSheet.tsx.
export function AddPiecesSheet({
  open,
  onClose,
  onPhoto,
  receipts,
}: {
  open: boolean;
  onClose: () => void;
  // The photo tile: the photograph she picks.
  onPhoto: (file: File) => void;
  // Receipts waiting to be reviewed, on the tile's corner.
  receipts?: number;
}) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <>
      <TileSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        title={copy.title}
        tiles={[
          {
            icon: 'link',
            label: copy.pasteUrl,
            onClick: () => go('/wardrobe/link'),
            testId: 'add-sheet-link',
          },
          {
            icon: 'camera',
            label: copy.photo,
            onClick: () => camera.current?.click(),
            testId: 'add-sheet-photo',
          },
          {
            icon: 'mail',
            label: copy.fromReceipt,
            onClick: () => go('/wardrobe/inbox'),
            ...(receipts ? { badge: receipts } : {}),
            testId: 'add-sheet-receipt',
          },
        ]}
      />
      <input
        ref={camera}
        type="file"
        accept={PHOTO_ACCEPT}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          onClose();
          onPhoto(f);
        }}
      />
    </>
  );
}
