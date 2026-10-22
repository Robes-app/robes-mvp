'use client';

import { isApiClientError } from '@robes/api-client';
import { useApi, useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Piece } from '@robes/contracts';
import { lookbook as copy, photoPieces } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Button, buttonClasses, Dialog, Eyebrow, Skeleton, Text, useToast } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SwapSheet } from '@/components/looks/swap-sheet';
import { errorCopy } from '@/lib/error-copy';
import { useRefreshLooks } from '@/lib/look-states';

const draftsFull = (err: unknown): boolean =>
  isApiClientError(err) &&
  err.code === 'conflict' &&
  (err.details as { reason?: string } | undefined)?.reason === 'drafts_full';

// A new look (legacy 4d, the guide): nothing is a row until the first piece lands; then it is a
// draft that waits in In progress. Five drafts wait at most — a sixth asks to let the oldest go.
export function Composer({ pieceId }: { pieceId?: string }) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useRefreshLooks();
  const [adding, setAdding] = useState<string | null | false>(false);
  const model = useApi('me.model.get');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState<{ input: CreateLookInput; oldest: string } | null>(null);

  const create = async (input: CreateLookInput) => {
    setBusy(true);
    try {
      const look = await api.call('looks.create', { input });
      refresh(look);
      router.push(`/look/${look.id}`);
    } catch (err) {
      if (!draftsFull(err)) {
        toast({ message: errorCopy(err) });
        return;
      }
      const drafts = await api
        .call('looks.list', { input: { limit: 60, status: 'draft' } })
        .catch(() => null);
      setFull({ input, oldest: drafts?.items.at(-1)?.name ?? copy.draftTile.untitled });
    } finally {
      setBusy(false);
    }
  };
  const start = (piece: Piece) =>
    void create({
      status: 'draft',
      pieces: [{ pieceId: piece.id }],
      ...(name.trim() ? { name: name.trim() } : {}),
    });

  // "Start a look with it" from a piece: the draft opens with that piece on the rack.
  const started = useRef(false);
  useEffect(() => {
    if (pieceId && !started.current) {
      started.current = true;
      void create({ status: 'draft', pieces: [{ pieceId }], anchorPieceId: pieceId });
    }
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pb-24">
      <header className="flex flex-col items-center gap-2 text-center">
        <Eyebrow>{copy.eyebrow.draft}</Eyebrow>
        {/* The title is the name: tap the italic line and write over it. */}
        <label className="w-full">
          <span className="sr-only">{copy.name.label}</span>
          <input
            value={name}
            maxLength={120}
            placeholder={copy.figure.untitled}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-0 border-transparent border-b bg-transparent text-center font-display font-light text-3xl text-ink italic placeholder:text-ink-faint focus-visible:border-ink focus-visible:outline-none"
          />
        </label>
      </header>
      <figure>
        <div className="relative">
          {model.data?.cell.imageUrl ? (
            // Her model (or Robes' catalog portrait) in the base layer: a signed URL, fixed 4:5.
            // biome-ignore lint/performance/noImgElement: signed catalog URL, fixed 4:5 frame
            <img
              src={model.data.cell.imageUrl}
              alt={copy.figure.alt}
              className="aspect-[4/5] w-full rounded-soft object-cover"
            />
          ) : model.isPending ? (
            <Skeleton className="aspect-[4/5] w-full" />
          ) : (
            <div
              aria-hidden
              className="flex aspect-[4/5] w-full items-center justify-center rounded-soft bg-surface"
            >
              <Icon name="user" size={160} className="text-border-control" />
            </div>
          )}
          {(
            [
              ['top', 'Tops', '31%'],
              ['bottom', 'Bottoms', '58%'],
              ['shoes', 'Shoes', '86%'],
            ] as const
          ).map(([slot, category, top]) => (
            <button
              key={slot}
              type="button"
              disabled={busy}
              onClick={() => setAdding(category)}
              style={{ top }}
              className="absolute left-1/2 min-h-11 -translate-x-1/2 -translate-y-1/2 rounded-pill border border-border-control bg-bg/90 px-4 font-medium font-sans text-ink text-xs uppercase tracking-[0.16em] backdrop-blur hover:border-ink focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
            >
              {copy.figure.slots[slot]}
            </button>
          ))}
        </div>
        <figcaption className="pt-3 text-center">
          <Text size="small" tone="muted" italic>
            {copy.guide.body}
          </Text>
        </figcaption>
      </figure>
      {/* The actions float above the tab bar (legacy start bar). */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
        <div className="pointer-events-auto flex gap-2 rounded-pill border border-hairline bg-bg/95 p-1.5 shadow-sm backdrop-blur">
          <Link href="/looks/new/photo" className={buttonClasses({ variant: 'primary' })}>
            <Icon name="camera" size={16} />
            {photoPieces.look.start.title}
          </Link>
          <Button variant="secondary" loading={busy} onClick={() => setAdding(null)}>
            {copy.rack.addPiece}
          </Button>
        </div>
      </div>
      <SwapSheet
        open={adding !== false}
        swapping={null}
        opensOn={adding || null}
        onRack={[]}
        onClose={() => setAdding(false)}
        onPick={start}
      />
      <Dialog
        open={full !== null}
        onOpenChange={(o) => {
          if (!o) setFull(null);
        }}
        title={copy.drafts.fullTitle}
        description={full ? copy.drafts.fullBody(full.oldest) : undefined}
        footer={
          <>
            <Button variant="quiet" onClick={() => setFull(null)}>
              {copy.drafts.keep}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const input = full?.input;
                setFull(null);
                if (input) void create({ ...input, letGoOldest: true });
              }}
            >
              {copy.drafts.letGo}
            </Button>
          </>
        }
      />
    </div>
  );
}
