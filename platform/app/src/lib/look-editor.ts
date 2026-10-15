'use client';

import { useApiClient, useApiMutation } from '@robes/api-client/react';
import {
  askChanges,
  type Look,
  type LookAskResult,
  type Piece,
  pieceRow,
  rackFromLook,
  rackUpdate,
} from '@robes/contracts';
import { errors } from '@robes/copy';
import { applyAsk, changedKeys, type RackState, rowNote } from '@robes/core/looks';
import { useToast } from '@robes/ui';
import { useMemo, useState } from 'react';
import type { RowMark } from '@/components/looks/rack-row';
import { useRefreshLooks as useInvalidateLooks, useRequestFrame } from './look-states';

// One look's rack while she works on it. A suggestion or a draft writes through on every change
// (a suggestion becomes a draft as it does); a saved look edits in place until Update. A look
// Robes framed has its frame re-dressed for the new rack, never her model (legacy 2026-10-07).
export function useLookEditor(look: Look) {
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const requestFrame = useRequestFrame();
  const live = look.status !== 'saved';
  const [editing, setEditing] = useState(live);
  const [rack, setRack] = useState<RackState>(() => rackFromLook(look));
  const [dirty, setDirty] = useState(false);
  const original = useMemo(() => new Set(rackFromLook(look).rows.map((r) => r.key)), [look]);
  // A fresh look from the server replaces the local rack unless she has unsaved edits.
  const [seen, setSeen] = useState(look.updatedAt);
  if (seen !== look.updatedAt && !dirty) {
    setSeen(look.updatedAt);
    setRack(rackFromLook(look));
  }
  const reframe = (l: Look) => {
    if (l.frame || l.setId) requestFrame(l.id);
  };
  const write = useApiMutation('looks.update', {
    onSuccess: (updated) => {
      refresh(updated);
      reframe(updated);
    },
    onError: () => toast({ message: errors.internal }),
  });

  const change = (next: RackState) => {
    setRack(next);
    if (live) {
      write.mutate({ params: { id: look.id }, input: rackUpdate(next, { keepEdits: true }) });
    } else {
      setEditing(true);
      setDirty(true);
    }
  };

  const mark = (key: string): RowMark | null => {
    const note = rowNote(rack, key);
    if (note) return note;
    return !live && editing && !original.has(key) ? { kind: 'added' } : null;
  };

  return {
    rack,
    editing,
    dirty,
    saving: write.isPending,
    changed: changedKeys(rack).length > 0,
    mark,
    startEditing: () => setEditing(true),
    // Edit on a suggestion: it becomes her draft, as it stands.
    startDraft: () =>
      write.mutate({ params: { id: look.id }, input: rackUpdate(rack, { keepEdits: true }) }),
    rename: (name: string) => write.mutate({ params: { id: look.id }, input: { name } }),
    answer: (result: LookAskResult) => {
      if (askChanges(result)) change(applyAsk(rack, result));
    },
    swap: (key: string, piece: Piece) => {
      const out = rack.rows.find((r) => r.key === key);
      // A swap is something she told Robes: it lands in her memory (style memory slice B).
      if (out) {
        void api
          .call('me.memory.record', {
            input: {
              kind: 'swap',
              pieceOut: out.name.slice(0, 120),
              pieceIn: piece.label.slice(0, 120),
              category: piece.category,
              surface: look.status,
              lookId: look.id,
            },
          })
          .catch(() => undefined);
      }
      change(
        applyAsk(rack, {
          swaps: [
            {
              key,
              to: {
                pieceId: piece.id,
                name: piece.label,
                category: piece.category,
                brand: piece.brand,
              },
            },
          ],
          back: [],
          styled: [],
        }),
      );
    },
    add: (piece: Piece) => change({ ...rack, rows: [...rack.rows, pieceRow(piece, null)] }),
    remove: (key: string) => {
      const { [key]: _gone, ...edits } = rack.edits;
      change({ ...rack, rows: rack.rows.filter((r) => r.key !== key), edits });
    },
    // ♡ a proposal: it joins her wishlist and the row reads Wishlist.
    wish: (key: string) => {
      const row = rack.rows.find((r) => r.key === key);
      if (!row?.proposal || row.proposal.wishlisted) return;
      const p = row.proposal;
      void api
        .call('wishlist.create', {
          input: {
            label: p.name,
            ...(p.brand ? { brand: p.brand } : {}),
            ...(p.color ? { color: p.color } : {}),
            ...(p.retailerHint ? { sourceLabel: p.retailerHint } : {}),
          },
        })
        .then(() =>
          change({
            ...rack,
            rows: rack.rows.map((r) =>
              r.key === key && r.proposal
                ? { ...r, proposal: { ...r.proposal, wishlisted: true } }
                : r,
            ),
          }),
        )
        .catch(() => toast({ message: errors.internal }));
    },
    // Saved look: Update commits the rack (working notes drop); Done/Discard leaves it as it was.
    update: () =>
      void write
        .mutateAsync({ params: { id: look.id }, input: rackUpdate(rack, { keepEdits: false }) })
        .then(() => {
          setDirty(false);
          setEditing(false);
        })
        .catch(() => undefined),
    discard: () => {
      setRack(rackFromLook(look));
      setDirty(false);
      setEditing(false);
    },
  };
}
