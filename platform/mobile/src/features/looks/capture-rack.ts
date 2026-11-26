import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
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
import {
  type CaptureStage,
  captureImage,
  captureRows,
  captureStage,
  cropReads,
  fileRow,
  isCaptureRow,
  type RackRow,
  type RemovedRow,
  removeRow,
  restoreRows,
} from '@robes/core/looks';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAllPieces } from '@/features/wardrobe/pieces';
import { nativeAnalytics } from '@/lib/analytics';
import { isTerminal, JOB_REFRESH_MS } from './ideas';

// What the capture rack needs of the look's editor (look-editor.ts).
interface RackEditor {
  rack: { rows: RackRow[] };
  setRows: (rows: RackRow[]) => void;
}

export interface CaptureRack {
  // True for a look that started as her photograph (Home's Capture).
  on: boolean;
  stage: CaptureStage;
  // The read found nothing to wear in the photo (said in place of "Couldn't find the pieces").
  nothing: boolean;
  removed: number;
  // She found, filed or removed something in this sitting (Discard asks first, PRD 1c.10).
  touched: boolean;
  // Her piece a found row looks like, when it is still in her wardrobe.
  suggested: (row: RackRow) => Piece | null;
  // A filed piece, before the look comes back from the server with it.
  pieceOf: (id: string) => Piece | undefined;
  // What the read saw of a found row.
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
  undo: () => void;
}

// The Rack of a look from her photograph (Capture PRD 1c.3–1c.6): Find the pieces reads the
// look's photo; each found piece is a row she matches to a piece of hers, adds to her wardrobe or
// removes, and whatever is left unfiled stays on the look as a suggestion. The rows live on the
// look's own rack through its editor, so a draft writes through and a saved look waits for
// Update look. The read is a job, polled (no SSE on native yet). Web twin:
// app/src/lib/capture-rack.ts.
export function useCaptureRack(look: Look, editor: RackEditor): CaptureRack {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const on = look.source === 'capture';
  const rows = editor.rack.rows;
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nothing, setNothing] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [touched, setTouched] = useState(false);
  const [everFound, setEverFound] = useState(false);
  const [removed, setRemoved] = useState<RemovedRow[]>([]);
  const [filed, setFiled] = useState<Record<string, Piece>>({});
  const [reads, setReads] = useState<Record<string, ReadPiece>>({});
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS),
    },
  );
  const current = useRef(rows);
  current.current = rows;
  const setRows = useRef(editor.setRows);
  setRows.current = editor.setRows;

  const waiting = rows.some(isCaptureRow);
  const wardrobe = useAllPieces();
  const crops = useReadCrops(on ? cropReads(rows, look) : []);

  // The read lands once: its pieces join the rack, or it says there was nothing to find.
  const handled = useRef<string | null>(null);
  const data = jobId ? job.data : undefined;
  const lost = jobId !== null && job.isError;
  useEffect(() => {
    if (!jobId || handled.current === jobId) return;
    if (!lost && !(data && data.id === jobId && isTerminal(data))) return;
    handled.current = jobId;
    setJobId(null);
    const pieces = data?.output.readPieces ?? [];
    if (lost || data?.status === 'failed' || data?.status === 'cancelled') {
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
    setRows.current([...current.current, ...found]);
  }, [jobId, data, lost]);

  const find = () => {
    if (starting || jobId) return;
    setStarting(true);
    setFailed(false);
    setNothing(false);
    setTouched(true);
    nativeAnalytics.track('look_pieces_asked');
    api
      .call('looks.findPieces', { params: { id: look.id } })
      .then((started) => setJobId(started.jobId))
      .catch(() => setFailed(true))
      .finally(() => setStarting(false));
  };

  const byId = new Map((on && waiting ? wardrobe.pieces : []).map((p) => [p.id, p]));
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
    removed: removed.length,
    touched,
    suggested: (row) => {
      const id = row.proposal?.capture?.suggestedPieceId;
      const piece = id ? byId.get(id) : undefined;
      return piece && !rows.some((r) => r.pieceId === piece.id) ? piece : null;
    },
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
      nativeAnalytics.track('look_piece_filed', { how });
      setTouched(true);
      setFiled((f) => ({ ...f, [piece.id]: piece }));
      editor.setRows(fileRow(rows, key, pieceRow(piece, null)));
      // A piece added from the photo is new in her wardrobe: its grid and its count move.
      if (how === 'add') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') });
      }
    },
    matchWish: (key, wish) => {
      nativeAnalytics.track('look_piece_filed', { how: 'wish' });
      setTouched(true);
      editor.setRows(fileRow(rows, key, wishRow(wish, key)));
    },
    saveWish: async (key) => {
      const capture = rows.find((r) => r.key === key)?.proposal?.capture;
      if (!capture) return false;
      try {
        const wish = await api.call('photoReads.wish', {
          params: { id: capture.readId },
          input: { index: capture.index },
        });
        nativeAnalytics.track('look_piece_filed', { how: 'new_wish' });
        setTouched(true);
        setRows.current(fileRow(current.current, key, wishRow(wish, key)));
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
        return true;
      } catch {
        return false;
      }
    },
    remove: (key) => {
      nativeAnalytics.track('look_piece_filed', { how: 'remove' });
      setTouched(true);
      const next = removeRow(rows, removed, key);
      setRemoved(next.removed);
      editor.setRows(next.rows);
    },
    undo: () => {
      editor.setRows(restoreRows(rows, removed));
      setRemoved([]);
    },
  };
}

// The crops of each read whose found rows the look holds none for (a saved look's rows wait on
// her phone until Update look), asked again while any is still being made. Web twin:
// useReadCrops in app/src/lib/capture-rack.ts.
function useReadCrops(readIds: readonly string[]): Map<string, Map<number, PieceImage>> {
  const api = useApiClient();
  const results = useQueries({
    queries: readIds.map((id) => ({
      queryKey: queryKeys.call('photoReads.crops', { params: { id } }),
      queryFn: () => api.call('photoReads.crops', { params: { id } }),
      refetchInterval: (q: { state: { data: ReadCrops | undefined } }) =>
        q.state.data?.crops.some((c) => c.image.status === 'pending') ? JOB_REFRESH_MS : false,
    })),
  });
  const out = new Map<string, Map<number, PieceImage>>();
  results.forEach((r, i) => {
    const id = readIds[i];
    if (id && r.data) out.set(id, new Map(r.data.crops.map((c) => [c.index, c.image])));
  });
  return out;
}
