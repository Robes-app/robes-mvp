import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import {
  askChanges,
  type Look,
  type LookAskResult,
  type Piece,
  pieceRow,
  rackFromLook,
  rackUpdate,
  type Wish,
  wishRow,
} from '@robes/contracts';
import { errors, lookbook, ui } from '@robes/copy';
import { applyAsk, changedKeys, type RackRow, type RackState, rowNote } from '@robes/core/looks';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { nativeAnalytics } from '@/lib/analytics';
import { isDraftsFull, useInvalidateLooks, useRequestFrame } from './look-states';
import type { RowMark } from './RackRow';

// One look's rack while she works on it. A suggestion or a draft writes through on every change
// (a suggestion becomes a draft as it does); a saved look edits in place until Update. The
// picture is drawn again only when she asks — Update the model, Dress it again, Save (plan
// 2026-11-03 D3) — through `redraw`; a suggestion's swap-in-place still re-frames by itself.
// `onChange` fires on every change to the rack. Web twin: app/src/lib/look-editor.ts.
// The pieces and wishes already on the rack, so the picker never offers one twice.
export const onRackIds = (rows: readonly RackRow[]): string[] =>
  rows.flatMap((r) =>
    r.pieceId ? [r.pieceId] : r.proposal?.wishlistItemId ? [r.proposal.wishlistItemId] : [],
  );

export function useLookEditor(look: Look, opts: { onChange?: () => void } = {}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const requestFrame = useRequestFrame();
  const onChange = useRef(opts.onChange);
  onChange.current = opts.onChange;
  const live = look.status !== 'saved';
  const [editing, setEditing] = useState(live);
  const [rack, setRack] = useState<RackState>(() => rackFromLook(look));
  const [dirty, setDirty] = useState(false);
  // The rack write in flight for a live look, so a picture asked for right after a change is
  // drawn on the rack as written (the drawer sends, then draws).
  const inFlight = useRef<Promise<unknown> | null>(null);
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
  // A suggestion's frame follows its rack by itself; a draft's and a saved look's wait for her.
  const reframe = (l: Look) => {
    if (l.status === 'suggested' && (l.frame || l.setId)) requestFrame(l.id);
  };
  const write = useApiMutation('looks.update', {
    onSuccess: (updated) => {
      refresh(updated);
      reframe(updated);
    },
    onError: (err, args) => {
      if (!isDraftsFull(err)) {
        toast.show({ message: errors.internal });
        return;
      }
      // Editing a suggestion makes a sixth draft: ask before the oldest goes (legacy confirm).
      void api
        .call('looks.list', { input: { limit: 60, status: 'draft' } })
        .catch(() => null)
        .then((drafts) =>
          Alert.alert(
            lookbook.drafts.fullTitle,
            lookbook.drafts.fullBody(drafts?.items.at(-1)?.name ?? lookbook.draftTile.untitled),
            [
              {
                text: lookbook.drafts.keep,
                style: 'cancel',
                onPress: () => setRack(rackFromLook(look)),
              },
              {
                text: lookbook.drafts.letGo,
                style: 'destructive',
                onPress: () =>
                  write.mutate({ ...args, input: { ...args.input, letGoOldest: true } }),
              },
            ],
          ),
        );
    },
  });

  const change = (next: RackState) => {
    setRack(next);
    onChange.current?.();
    if (live) {
      inFlight.current = write
        .mutateAsync({ params: { id: look.id }, input: rackUpdate(next, { keepEdits: true }) })
        .catch(() => undefined);
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
    // The picture drawn again for the rack as it stands: Robes' frame, else her model.
    // `note`: her Adjust model image words (D21), kept on the look for every later redraw; the
    // pieces never change for it.
    redraw: async (note?: string) => {
      await inFlight.current;
      const input = note === undefined ? {} : { note };
      if (look.frame || look.setId)
        await api.call('looks.frame', { params: { id: look.id }, input });
      else await api.call('looks.renderOnModel', { params: { id: look.id }, input });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
      });
    },
    answer: (result: LookAskResult) => {
      if (askChanges(result)) change(applyAsk(rack, result));
    },
    // A swap lands at once behind a 6 s Undo that puts the rack back (beta's swap pill). A draft
    // writes the rack back (its rack is re-read from the server after each write); a saved look
    // being edited goes back to how it stood, unsaved changes and all, unless she has changed it
    // again since (L5, L10).
    swap: (key: string, piece: Piece) => {
      const before = rack;
      const wasDirty = dirty;
      const next = swapped(key, piece);
      nativeAnalytics.track('piece_swapped', { surface: look.status, cat: piece.category });
      change(next);
      toast.show({
        message: lookbook.swap.swapped(piece.label),
        action: {
          label: ui.undo,
          onPress: () => {
            if (live) {
              change(before);
              return;
            }
            if (current.current !== next) return;
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
      nativeAnalytics.track('piece_swapped', { surface: look.status, cat: piece.category });
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
          toast.show({
            message: lookbook.swap.swapped(piece.label),
            action: {
              label: ui.undo,
              onPress: () => {
                setRack(before);
                void put(before)
                  .then((back) => {
                    refresh(back);
                    reframe(back);
                  })
                  .catch(() => toast.show({ message: errors.internal }));
              },
            },
          });
        })
        .catch(() => {
          setRack(before);
          toast.show({ message: errors.internal });
        });
    },
    // The rows of a look from her photograph (Capture PRD 1c.6): found rows land, one files as her
    // piece, one leaves or comes back. The rack reducer in @robes/core/looks decides the rows.
    setRows: (rows: RackRow[]) => {
      const keys = new Set(rows.map((r) => r.key));
      const edits = Object.fromEntries(Object.entries(rack.edits).filter(([k]) => keys.has(k)));
      change({ ...rack, rows, edits });
    },
    add: (piece: Piece) => {
      nativeAnalytics.track('look_piece_added', { surface: look.status, cat: piece.category });
      change({ ...rack, rows: [...rack.rows, pieceRow(piece, null)] });
    },
    // A wish from the picker's WISHLIST tab (PRD rev 3 §4.6): a proposal row that is already hers
    // to find, so the look carries a piece to find and Save files nothing twice.
    addWish: (wish: Wish) => {
      if (rack.rows.some((r) => r.proposal?.wishlistItemId === wish.id)) return;
      nativeAnalytics.track('look_piece_added', { surface: look.status, cat: wish.category });
      change({ ...rack, rows: [...rack.rows, wishRow(wish)] });
    },
    remove: (key: string) => {
      nativeAnalytics.track('look_piece_removed', { surface: look.status });
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
        .then((wish) =>
          change({
            ...rack,
            rows: rack.rows.map((r) =>
              r.key === key && r.proposal
                ? { ...r, proposal: { ...r.proposal, wishlisted: true, wishlistItemId: wish.id } }
                : r,
            ),
          }),
        )
        .catch(() => toast.show({ message: errors.internal }));
    },
    // Saved look: Update commits the rack (working notes drop); Done/Discard leaves it as it was.
    update: (): Promise<boolean> =>
      write
        .mutateAsync({ params: { id: look.id }, input: rackUpdate(rack, { keepEdits: false }) })
        .then((updated) => {
          nativeAnalytics.track('look_updated', { pieces: updated.pieces.length });
          setDirty(false);
          setEditing(false);
          toast.show({ message: lookbook.updated, duration: 2600 });
          return true;
        })
        .catch(() => false),
    discard: () => {
      setRack(rackFromLook(look));
      setDirty(false);
      setEditing(false);
    },
  };
}
