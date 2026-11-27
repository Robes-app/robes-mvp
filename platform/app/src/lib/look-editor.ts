'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import {
  askChanges,
  type Look,
  type LookAskResult,
  type Piece,
  pieceRow,
  rackFromLook,
  rackUpdate,
  swapForWish,
  type UpdateLookInput,
  type Wish,
  wishRow,
} from '@robes/contracts';
import { errors, lookbook, wardrobe } from '@robes/copy';
import { applyAsk, filesOnly, type RackRow, type RackState, rowNote } from '@robes/core/looks';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { z } from 'zod';
import { useAnalytics } from '@/components/analytics-provider';
import type { RowMark } from '@/components/looks/rack-row';
import { isDraftsFull, useRefreshLooks as useInvalidateLooks } from './look-states';

// One look's rack while she works on it. Every change is written as she makes it (Annie, 27 Nov):
// a draft keeps its working notes, a saved look drops them, and a suggestion stays suggested as it
// is kept (design "Suggested looks", 23 Nov). The picture is drawn again only when she asks — Update the
// model, Save (plan 2026-11-03 D3) — through `redraw`: Robes' frame for a look it framed, else her
// model. `onChange` fires on every change to the rack, so the thread can count what the picture
// is behind.
// The pieces and wishes already on the rack, so the picker never offers one twice.
export const onRackIds = (rows: readonly RackRow[]): string[] =>
  rows.flatMap((r) =>
    r.pieceId ? [r.pieceId] : r.proposal?.wishlistItemId ? [r.proposal.wishlistItemId] : [],
  );

// What a swap puts in a row's place: one of her pieces, or a wish as a piece to find. Native
// twin: mobile/src/features/looks/look-editor.ts.
export type SwapIn = { piece: Piece } | { wish: Wish };

export function useLookEditor(look: Look, opts: { onChange?: () => void } = {}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const { track } = useAnalytics().analytics;
  const onChange = useRef(opts.onChange);
  onChange.current = opts.onChange;
  const [rack, setRack] = useState<RackState>(() => rackFromLook(look));
  // Changes to a saved look that have been kept, for its Saved tick.
  const [saves, setSaves] = useState(0);
  // The rack write in flight, so a picture asked for right after a change is drawn on the rack
  // as written (the drawer sends, then draws).
  const inFlight = useRef<Promise<unknown> | null>(null);
  // The rack as it stands now, for an Undo that fires after later renders.
  const current = useRef(rack);
  current.current = rack;
  // A fresh look from the server replaces the local rack.
  const [seen, setSeen] = useState(look.updatedAt);
  if (seen !== look.updatedAt) {
    setSeen(look.updatedAt);
    setRack(rackFromLook(look));
  }
  const write = useApiMutation('looks.update', {
    onSuccess: (updated) => refresh(updated),
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

  // `drawn`: the picture already wears `next` (a found piece filed, Annie 26 Nov), so it is not
  // counted as a change the picture is behind on.
  const change = (next: RackState, drawn = false) => {
    setRack(next);
    if (!drawn) onChange.current?.();
    const { status } = look;
    inFlight.current = write
      .mutateAsync({
        params: { id: look.id },
        input: {
          // A saved look never carries working notes.
          ...rackUpdate(next, { keepEdits: status === 'draft' }),
          ...(status === 'suggested' ? { keepSuggested: true } : {}),
        },
      })
      .then((updated) => {
        if (status === 'draft') return;
        track('look_updated', { pieces: updated.pieces.length });
        if (status === 'saved') setSaves((n) => n + 1);
      })
      .catch(() => undefined);
  };

  // A swap is something she told Robes: it lands in her memory (style memory slice B). What comes
  // in is one of her pieces or, from the picker's WISHLIST tab, a wish as a piece to find.
  const swapped = (key: string, into: SwapIn): RackState => {
    const piece = 'piece' in into ? into.piece : into.wish;
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
    if ('wish' in into) return swapForWish(rack, key, into.wish);
    return applyAsk(rack, {
      swaps: [
        {
          key,
          to: {
            pieceId: piece.id,
            name: piece.label,
            category: piece.category,
            categoryL2: into.piece.categoryL2,
            brand: into.piece.brand,
          },
        },
      ],
      back: [],
      styled: [],
    });
  };

  const mark = (key: string): RowMark | null => rowNote(rack, key);

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
    saving: write.isPending,
    // How many of her changes to a saved look have been kept: each raises its Saved tick.
    saves,
    // Resolves once the rack is on the look as she left it.
    written: async (): Promise<void> => {
      await inFlight.current;
    },
    mark,
    rename: (name: string) => write.mutate({ params: { id: look.id }, input: { name } }),
    // The picture drawn again for the rack as it stands: Robes' frame, else her model. Resolves
    // once the job is started; the look then reads pending until it lands.
    // `note`: her note about the picture (D21; from the prompt, look-ask v5), kept on the look for every later redraw; the
    // pieces never change for it.
    // True when a picture is now being drawn; false when the one shown already wears this rack.
    redraw: async (note?: string): Promise<boolean> => {
      await inFlight.current;
      const input = note === undefined ? {} : { note };
      const { status } =
        look.frame || look.setId
          ? await api.call('looks.frame', { params: { id: look.id }, input })
          : await api.call('looks.renderOnModel', { params: { id: look.id }, input });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
      });
      return status === 'queued' || status === 'running';
    },
    answer: (result: LookAskResult) => {
      if (askChanges(result)) change(applyAsk(rack, result));
    },
    // A swap lands at once behind a 6 s Undo that writes the rack back as it stood (beta's swap
    // pill; the rack is re-read from the server after each write).
    swap: (key: string, into: SwapIn) => {
      const piece = 'piece' in into ? into.piece : into.wish;
      const before = rack;
      const next = swapped(key, into);
      track('piece_swapped', { surface: look.status, cat: piece.category });
      change(next);
      toast({
        message: lookbook.swap.swapped(piece.label),
        action: {
          label: wardrobe.undo,
          onAction: () => change(before),
        },
      });
    },
    // The rows of a look from her photograph (Capture PRD 1c.6): found rows land, one files as her
    // piece, one leaves or comes back. The rack reducer in @robes/core/looks decides the rows.
    setRows: (rows: RackRow[]) => {
      const keys = new Set(rows.map((r) => r.key));
      const edits = Object.fromEntries(Object.entries(rack.edits).filter(([k]) => keys.has(k)));
      change({ ...rack, rows, edits }, filesOnly(current.current.rows, rows));
    },
    // Everything she picked at once lands as ONE change: one write, one picture. Added one by
    // one, each add rebuilt the rack she opened the picker on and the last pick replaced the
    // others (21 Nov: three pieces picked, one on the look). A wish from the WISHLIST tab (PRD
    // rev 3 §4.6) is a proposal row already hers to find, so Save files nothing twice.
    addAll: (pieces: readonly Piece[], wishes: readonly Wish[] = []) => {
      const rows = [...rack.rows];
      for (const piece of pieces) {
        if (rows.some((r) => r.pieceId === piece.id)) continue;
        track('look_piece_added', { surface: look.status, cat: piece.category });
        rows.push(pieceRow(piece, null));
      }
      for (const wish of wishes) {
        if (rows.some((r) => r.proposal?.wishlistItemId === wish.id)) continue;
        track('look_piece_added', { surface: look.status, cat: wish.category });
        rows.push(wishRow(wish));
      }
      if (rows.length !== rack.rows.length) change({ ...rack, rows });
    },
    remove: (key: string) => {
      track('look_piece_removed', { surface: look.status });
      const { [key]: _gone, ...edits } = rack.edits;
      change({ ...rack, rows: rack.rows.filter((r) => r.key !== key), edits });
    },
    // ♡ a proposal: it joins her wishlist and the row reads Wishlist.
    wish: (key: string) => {
      const row = rack.rows.find((r) => r.key === key);
      if (!row?.proposal || row.proposal.wishlisted) return;
      const mark = (r: RackState, wishId: string): RackState => ({
        ...r,
        rows: r.rows.map((x) =>
          x.key === key && x.proposal
            ? { ...x, proposal: { ...x.proposal, wishlisted: true, wishlistItemId: wishId } }
            : x,
        ),
      });
      // A piece the look already holds is filed on the server as Save files it — its photo,
      // price and shop link — and marked there at once, so the rack waits on nothing and Save
      // never files it twice. Only a row the look does not hold yet (its write still on the way)
      // is filed from what the rack knows.
      if (look.proposals.some((p) => p.key === key)) {
        void api
          .call('looks.proposals.wish', { params: { id: look.id, key }, input: {} })
          .then((updated) => {
            const wishId = updated.proposals.find((p) => p.key === key)?.wishlistItemId;
            if (wishId) setRack(mark(current.current, wishId));
            refresh(updated);
          })
          .catch(() => toast({ message: errors.internal }));
        return;
      }
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
        .then((wish) => change(mark(rack, wish.id)))
        .catch(() => toast({ message: errors.internal }));
    },
  };
}
