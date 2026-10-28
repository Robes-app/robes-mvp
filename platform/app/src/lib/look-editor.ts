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
  type UpdateLookInput,
} from '@robes/contracts';
import { errors, lookbook, wardrobe } from '@robes/copy';
import { applyAsk, changedKeys, type RackState, rowNote } from '@robes/core/looks';
import { useToast } from '@robes/ui';
import { useMemo, useRef, useState } from 'react';
import type { z } from 'zod';
import type { RowMark } from '@/components/looks/rack-row';
import {
  isDraftsFull,
  useRefreshLooks as useInvalidateLooks,
  useRedress,
  useRequestFrame,
} from './look-states';

// One look's rack while she works on it. A suggestion or a draft writes through on every change
// (a suggestion becomes a draft as it does); a saved look edits in place until Update. A look
// Robes framed has its frame re-dressed for the new rack, never her model (legacy 2026-10-07).
export function useLookEditor(look: Look) {
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const requestFrame = useRequestFrame();
  const redress = useRedress();
  const live = look.status !== 'saved';
  const [editing, setEditing] = useState(live);
  const [rack, setRack] = useState<RackState>(() => rackFromLook(look));
  const [dirty, setDirty] = useState(false);
  // The rack as it stands now, for an Undo that fires after later renders.
  const current = useRef(rack);
  current.current = rack;
  const original = useMemo(() => new Set(rackFromLook(look).rows.map((r) => r.key)), [look]);
  // A fresh look from the server replaces the local rack unless she has unsaved edits.
  const [seen, setSeen] = useState(look.updatedAt);
  if (seen !== look.updatedAt && !dirty) {
    setSeen(look.updatedAt);
    setRack(rackFromLook(look));
  }
  // Robes' frame is re-dressed for the new rack; a saved look on her model is drawn again.
  const reframe = (l: Look) => {
    if (l.frame || l.setId) requestFrame(l.id);
    else redress(l);
  };
  const write = useApiMutation('looks.update', {
    onSuccess: (updated) => {
      refresh(updated);
      reframe(updated);
    },
    onError: (err, args) => {
      if (!isDraftsFull(err)) {
        toast({ message: errors.internal });
        return;
      }
      // Editing a suggestion makes a sixth draft: ask before the oldest goes (legacy confirm).
      void api
        .call('looks.list', { input: { limit: 60, status: 'draft' } })
        .catch(() => null)
        .then((drafts) =>
          setFull({ input: args.input ?? {}, oldest: drafts?.items.at(-1)?.name ?? null }),
        );
    },
  });
  const [full, setFull] = useState<{
    input: z.input<typeof UpdateLookInput>;
    oldest: string | null;
  } | null>(null);

  const change = (next: RackState) => {
    setRack(next);
    if (live) {
      write.mutate({ params: { id: look.id }, input: rackUpdate(next, { keepEdits: true }) });
    } else {
      setEditing(true);
      setDirty(true);
    }
  };

  // A swap is something she told Robes: it lands in her memory (style memory slice B).
  const swapped = (key: string, piece: Piece): RackState => {
    const out = rack.rows.find((r) => r.key === key);
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
    return applyAsk(rack, {
      swaps: [
        {
          key,
          to: {
            pieceId: piece.id,
            name: piece.label,
            category: piece.category,
            categoryL2: piece.categoryL2,
            brand: piece.brand,
          },
        },
      ],
      back: [],
      styled: [],
    });
  };

  const mark = (key: string): RowMark | null => {
    const note = rowNote(rack, key);
    if (note) return note;
    return !live && editing && !original.has(key) ? { kind: 'added' } : null;
  };

  return {
    // Five drafts wait: the page asks; letGo retries with the oldest let go, keep undoes the edit.
    full,
    letGo: () => {
      if (!full) return;
      setFull(null);
      write.mutate({ params: { id: look.id }, input: { ...full.input, letGoOldest: true } });
    },
    keep: () => {
      setFull(null);
      setRack(rackFromLook(look));
    },
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
    // A swap lands at once behind a 6 s Undo that puts the rack back (beta's swap pill) —
    // unless she has changed it again since. A draft writes the rack back; a saved look being
    // edited goes back to how it stood, unsaved changes and all (L5, L10).
    swap: (key: string, piece: Piece) => {
      const before = rack;
      const wasDirty = dirty;
      const next = swapped(key, piece);
      change(next);
      toast({
        message: lookbook.swap.swapped(piece.label),
        action: {
          label: wardrobe.undo,
          onAction: () => {
            if (current.current !== next) return;
            if (live) {
              change(before);
              return;
            }
            setRack(before);
            setDirty(wasDirty);
          },
        },
      });
    },
    // ↻ on a suggested look (legacy 0.1): the swap lands on the suggestion at once, which stays
    // suggested, behind a quiet Undo that puts the rack back.
    swapKeep: (key: string, piece: Piece) => {
      const before = rack;
      const next = swapped(key, piece);
      const put = (r: RackState) =>
        api.call('looks.update', {
          params: { id: look.id },
          input: { ...rackUpdate(r, { keepEdits: true }), keepSuggested: true },
        });
      setRack(next);
      void put(next)
        .then((updated) => {
          refresh(updated);
          reframe(updated);
          toast({
            message: lookbook.swap.swapped(piece.label),
            action: {
              label: wardrobe.undo,
              onAction: () => {
                setRack(before);
                void put(before)
                  .then((back) => {
                    refresh(back);
                    reframe(back);
                  })
                  .catch(() => toast({ message: errors.internal }));
              },
            },
          });
        })
        .catch(() => {
          setRack(before);
          toast({ message: errors.internal });
        });
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
          toast({ message: lookbook.updated });
        })
        .catch(() => undefined),
    discard: () => {
      setRack(rackFromLook(look));
      setDirty(false);
      setEditing(false);
    },
  };
}
