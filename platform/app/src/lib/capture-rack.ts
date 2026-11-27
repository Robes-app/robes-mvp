'use client';

import { queryKeys, useApiAll, useApiClient } from '@robes/api-client/react';
import {
  type Look,
  type Piece,
  type PieceImage,
  pieceRow,
  type ReadCrops,
  type ReadPiece,
  type Wish,
  wishRow,
} from '@robes/contracts';
import { errors, lookbook, wardrobe as wardrobeCopy } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import {
  type CaptureStage,
  captureImage,
  captureRows,
  captureStage,
  cropReads,
  dismissSuggestion,
  fileRow,
  isCaptureRow,
  putBack,
  type RackRow,
  rekeyed,
  suggestedIds,
} from '@robes/core/looks';
import { useToast } from '@robes/ui';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { useJob } from './use-job';
import { invalidateWardrobe } from './wardrobe';

// What the capture rack needs of the look's editor (lib/look-editor.ts).
interface RackEditor {
  rack: { rows: RackRow[] };
  setRows: (rows: RackRow[], how?: 'quiet' | 'undo') => void;
  remove: (key: string, found?: boolean) => void;
  written: () => Promise<void>;
}

export interface CaptureRack {
  // True for a look that started as her photograph (Home's Capture).
  on: boolean;
  stage: CaptureStage;
  // The read found nothing to wear in the photo (said in place of "Couldn't find the pieces").
  nothing: boolean;
  // She found, filed or removed something in this sitting (a draft's Discard asks first, PRD 1c.10).
  touched: boolean;
  // Her piece a found row looks like, when it is still in her wardrobe: the likeliest she has
  // not said no to.
  suggested: (row: RackRow) => Piece | null;
  // "Looks like your …" is not it: the suggestion leaves the row, on this look.
  dismiss: (key: string) => void;
  // A filed piece, before the look comes back from the server with it.
  pieceOf: (id: string) => Piece | undefined;
  // What the read saw of a found row (its box, for the crop drawn from the photo).
  found: (row: RackRow) => ReadPiece | undefined;
  // A found row's crop: pending (the row's loading state) until its renditions land.
  image: (row: RackRow) => PieceImage | null;
  find: () => void;
  skip: () => void;
  match: (key: string, piece: Piece, how: 'match' | 'suggested' | 'add') => void;
  // A wish takes a found row as a piece to find: one from her wishlist, or the found piece saved
  // to it as a new wish, its crop for its picture (TestFlight 20 Nov). Resolves false on failure.
  matchWish: (key: string, wish: Wish) => void;
  saveWish: (key: string) => Promise<boolean>;
  remove: (key: string) => void;
}

// The Rack of a look from her photograph (Capture PRD 1c.3–1c.6): Find the pieces reads the
// look's photo; each found piece is a row she matches to a piece of hers, adds to her wardrobe or
// removes, and whatever is left unfiled stays on the look as a suggestion. Each filing stands
// behind a 6 s Undo that puts the found row back and takes the piece or wish it made out of her
// wardrobe or wishlist again (Annie, 27 Nov). The rows live on the
// look's own rack through its editor, which writes every change as it is made, the pieces a read
// finds among them. Nothing is drawn for it: her model wears the look when she asks, from the
// pill on its picture (Annie, 27 Nov; supersedes D1's draw as the read lands).
// Native twin: mobile/src/features/looks/capture-rack.ts.
export function useCaptureRack(look: Look, editor: RackEditor): CaptureRack {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { track } = useAnalytics().analytics;
  const on = look.source === 'capture';
  const rows = editor.rack.rows;
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nothing, setNothing] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [touched, setTouched] = useState(false);
  const [everFound, setEverFound] = useState(false);
  const [filed, setFiled] = useState<Record<string, Piece>>({});
  const [reads, setReads] = useState<Record<string, ReadPiece>>({});
  const { job, connection } = useJob(jobId);
  const current = useRef(rows);
  current.current = rows;
  const setRows = useRef(editor.setRows);
  setRows.current = editor.setRows;
  const written = useRef(editor.written);
  written.current = editor.written;

  const waiting = rows.some(isCaptureRow);
  const wardrobe = useApiAll(
    'wardrobe.list',
    { input: { limit: 100 } },
    { enabled: on && waiting },
  );
  const crops = useReadCrops(on ? cropReads(rows, look) : []);

  // The read lands once: its pieces join the rack, or it says there was nothing to find.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!jobId || handled.current === jobId) return;
    const lost = connection === 'unavailable';
    if (!lost && !(job && job.id === jobId && isTerminalJobStatus(job.status))) return;
    handled.current = jobId;
    setJobId(null);
    const pieces = job?.output.readPieces ?? [];
    if (lost || job?.status === 'failed' || job?.status === 'cancelled') {
      setFailed(true);
      return;
    }
    if (pieces.length === 0) {
      setNothing(true);
      setFailed(true);
      return;
    }
    const found = captureRows(jobId, pieces);
    setReads((r) => ({
      ...r,
      ...Object.fromEntries(
        found.flatMap((row) => {
          const read = pieces.find((p) => p.index === row.proposal?.capture?.index);
          return read ? [[row.key, read] as const] : [];
        }),
      ),
    }));
    setEverFound(true);
    editor.setRows([...current.current, ...found]);
  }, [jobId, job, connection, editor]);

  // A filing's toast. Undo puts the found row back where it stood on the rack as it is now,
  // takes off the row it became, and then `unfile` takes back what the filing made. `how`: what the picture
  // makes of the Undo. `fresh`: the row comes back under a new key (it was a wish; `rekeyed`).
  const filedToast = (
    message: string,
    key: string,
    undo: { became: string | null; how: 'quiet' | 'undo'; fresh?: boolean },
    unfile?: () => Promise<unknown>,
  ) => {
    const at = rows.findIndex((r) => r.key === key);
    const was = rows[at];
    if (!was) return;
    toast({
      message,
      action: {
        label: wardrobeCopy.undo,
        onAction: () => {
          const back = undo.fresh ? rekeyed(was) : was;
          const read = reads[key];
          if (read && back.key !== key) setReads((r) => ({ ...r, [back.key]: read }));
          setRows.current(putBack(current.current, back, at, undo.became), undo.how);
          if (!unfile) return;
          // The look lets go of the piece first, then her wardrobe or wishlist does.
          void written
            .current()
            .then(unfile)
            .catch(() => toast({ message: errors.internal }));
        },
      },
    });
  };
  const refreshWardrobe = () => {
    void invalidateWardrobe(queryClient);
  };

  const find = () => {
    if (starting || jobId) return;
    setStarting(true);
    setFailed(false);
    setNothing(false);
    setTouched(true);
    track('look_pieces_asked');
    api
      .call('looks.findPieces', { params: { id: look.id } })
      .then((started) => setJobId(started.jobId))
      .catch(() => setFailed(true))
      .finally(() => setStarting(false));
  };

  const byId = new Map((wardrobe.data?.items ?? []).map((p) => [p.id, p]));
  return {
    on,
    stage: captureStage({
      rows: rows.length,
      finding: starting || jobId !== null,
      failed,
      settled: skipped || look.status === 'saved',
      cleared: everFound && rows.length === 0,
    }),
    nothing,
    touched,
    suggested: (row) =>
      suggestedIds(row)
        .map((id) => byId.get(id))
        .find((piece) => piece && !rows.some((r) => r.pieceId === piece.id)) ?? null,
    // Nothing the picture wears changes.
    dismiss: (key) => editor.setRows(dismissSuggestion(rows, key), 'quiet'),
    pieceOf: (id) => filed[id],
    found: (row) => reads[row.key],
    image: (row) => {
      const capture = row.proposal?.capture;
      const fromRead = capture ? crops.get(capture.readId)?.get(capture.index) : undefined;
      return captureImage(row, look.captureImages[row.key], fromRead);
    },
    find,
    skip: () => setSkipped(true),
    match: (key, piece, how) => {
      track('look_piece_filed', { how });
      setTouched(true);
      setFiled((f) => ({ ...f, [piece.id]: piece }));
      // Added from the photo, or the piece Robes saw in it, it is the piece the picture wears;
      // any other piece of hers is a change the picture is behind on (Annie, 27 Nov).
      const seen = rows.find((r) => r.key === key)?.proposal?.capture?.suggestedPieceId;
      const worn = how !== 'match' || seen === piece.id;
      const next = fileRow(rows, key, pieceRow(piece, null), worn);
      editor.setRows(next);
      // The row the found one became, unless her piece hung there already.
      const became = next.find((r) => !rows.includes(r))?.key ?? null;
      if (how !== 'add') {
        filedToast(lookbook.swap.swapped(piece.label), key, {
          became,
          how: worn ? 'quiet' : 'undo',
        });
        return;
      }
      // A piece added from the photo is new in her wardrobe: its grid and its count move, and
      // Undo takes it out again (a soft delete, as her own Delete is).
      refreshWardrobe();
      filedToast(wardrobeCopy.receipts.added, key, { became, how: 'quiet' }, () =>
        api.call('wardrobe.delete', { params: { id: piece.id } }).then(refreshWardrobe),
      );
    },
    matchWish: (key, wish) => {
      track('look_piece_filed', { how: 'wish' });
      setTouched(true);
      // A wish she already had is another piece than the one photographed.
      editor.setRows(fileRow(rows, key, wishRow(wish, key), false));
      filedToast(lookbook.swap.swapped(wish.label), key, { became: key, how: 'undo', fresh: true });
    },
    saveWish: async (key) => {
      const capture = rows.find((r) => r.key === key)?.proposal?.capture;
      if (!capture) return false;
      try {
        const wish = await api.call('photoReads.wish', {
          params: { id: capture.readId },
          input: { index: capture.index },
        });
        track('look_piece_filed', { how: 'new_wish' });
        setTouched(true);
        setRows.current(fileRow(current.current, key, wishRow(wish, key)));
        const refreshWishes = () =>
          queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
        void refreshWishes();
        filedToast(
          lookbook.savedSuggestion.body(1),
          key,
          { became: key, how: 'quiet', fresh: true },
          () => api.call('wishlist.delete', { params: { id: wish.id } }).then(refreshWishes),
        );
        return true;
      } catch {
        return false;
      }
    },
    remove: (key) => {
      track('look_piece_filed', { how: 'remove' });
      setTouched(true);
      editor.remove(key, true);
    },
  };
}

const CROP_REFRESH_MS = 3_000;

// The crops of each read whose found rows the look holds none for (a row just written, before
// the look comes back with it), asked again while any is still being made. Native twin:
// useReadCrops in mobile/src/features/looks/capture-rack.ts.
function useReadCrops(readIds: readonly string[]): Map<string, Map<number, PieceImage>> {
  const api = useApiClient();
  const results = useQueries({
    queries: readIds.map((id) => ({
      queryKey: queryKeys.call('photoReads.crops', { params: { id } }),
      queryFn: () => api.call('photoReads.crops', { params: { id } }),
      refetchInterval: (q: { state: { data: ReadCrops | undefined } }) =>
        q.state.data?.crops.some((c) => c.image.status === 'pending') ? CROP_REFRESH_MS : false,
    })),
  });
  const out = new Map<string, Map<number, PieceImage>>();
  results.forEach((r, i) => {
    const id = readIds[i];
    if (id && r.data) out.set(id, new Map(r.data.crops.map((c) => [c.index, c.image])));
  });
  return out;
}
