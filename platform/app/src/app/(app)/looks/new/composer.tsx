'use client';

import { isApiClientError } from '@robes/api-client';
import { useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Piece } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Button, Dialog, Field, Text, useToast } from '@robes/ui';
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
  const [adding, setAdding] = useState(false);
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
    <div className="flex flex-col gap-6">
      <Field
        label={copy.name.label}
        placeholder={copy.name.placeholder}
        value={name}
        maxLength={120}
        hint={copy.name.unnamed}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex flex-col gap-1 rounded-soft border border-dashed border-border-control p-5">
        <Text className="font-display text-xl">{copy.guide.title}</Text>
        <Text size="small" tone="muted">
          {copy.guide.body}
        </Text>
        <Text size="small" tone="faint">
          {copy.guide.hint}
        </Text>
      </div>
      <Text size="small" tone="muted">
        {copy.guide.after}
      </Text>
      <Button variant="secondary" loading={busy} onClick={() => setAdding(true)}>
        {copy.rack.addPiece}
      </Button>
      <SwapSheet
        open={adding}
        swapping={null}
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
