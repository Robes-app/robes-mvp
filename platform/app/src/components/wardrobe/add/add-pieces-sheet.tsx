'use client';

import { useApi } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import type { AddDestination } from '@robes/core/add-flow';
import { Button, Field, TileSheet } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';
import { PHOTO_ACCEPT } from '@/lib/upload';

const copy = wardrobe.addSheet;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Add pieces sheet (Front Door PRD rev 3 §4.6, §7.4): three tiles on glass — PASTE URL turns
// the sheet into Add from Link with the field inline (✓ reads the page), PHOTO the file picker
// (over the draft the photograph files straight onto the look; elsewhere it opens the camera
// flow), FROM RECEIPT the Receipts with the count waiting on its corner. "Add without a photo"
// stays as a quiet line under the tiles. Native twin: mobile/src/features/wardrobe/add/AddPiecesSheet.tsx.
export function AddPiecesSheet({
  open,
  onClose,
  onPhoto,
  to = 'wardrobe',
  draft = false,
}: {
  open: boolean;
  onClose: () => void;
  // The photo tile over the draft: the photograph she picks. Without it the tile opens the
  // wardrobe's camera flow.
  onPhoto?: (file: File) => void;
  // Where the pieces go (the Wishlist tab's + files wishes).
  to?: AddDestination;
  // Over the draft the sheet reads "Add your pieces".
  draft?: boolean;
}) {
  const router = useRouter();
  const inbox = useApi('inbox.list', undefined, { enabled: open });
  const receipts = inbox.data?.count ?? 0;
  const camera = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState(false);
  const [url, setUrl] = useState('');
  const close = () => {
    setLink(false);
    setUrl('');
    onClose();
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };
  const read = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    go(`/wardrobe/link?to=${to}&url=${encodeURIComponent(trimmed)}`);
  };
  return (
    <>
      <TileSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={link ? copy.linkTitle : draft ? copy.draftTitle : copy.title}
        {...(link ? { selected: copy.pasteUrl } : {})}
        tiles={[
          {
            icon: 'link',
            label: copy.pasteUrl,
            onClick: () => setLink(true),
            testId: 'add-sheet-link',
          },
          {
            icon: 'camera',
            label: copy.photo,
            onClick: () => {
              if (onPhoto) camera.current?.click();
              else go(`/wardrobe/add?to=${to}&start=camera`);
            },
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
      >
        {link ? (
          <form onSubmit={read} className="flex flex-col gap-3">
            <Field
              label={copy.linkField}
              name="url"
              type="url"
              inputMode="url"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={wardrobe.add.link.placeholder}
              maxLength={2048}
              data-testid="add-sheet-url"
            />
            <Button type="submit" variant="primary" block disabled={url.trim() === ''}>
              {copy.linkGo}
            </Button>
          </form>
        ) : (
          <Link
            href={`/wardrobe/manual?to=${to}`}
            onClick={close}
            className={`block min-h-11 text-center font-sans text-ink-muted text-sm leading-[44px] underline underline-offset-4 hover:text-ink ${focus}`}
          >
            {copy.manual}
          </Link>
        )}
      </TileSheet>
      {onPhoto ? (
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
            close();
            onPhoto(f);
          }}
        />
      ) : null}
    </>
  );
}
