'use client';

import { useApi, useApiClient } from '@robes/api-client/react';
import { type Look, type Piece, pieceRow, type ReadPiece } from '@robes/contracts';
import { isTerminalJobStatus } from '@robes/core/jobs';
import {
  type CaptureStage,
  captureRows,
  captureStage,
  fileRow,
  isCaptureRow,
  type RackRow,
  type RemovedRow,
  removeRow,
  restoreRows,
} from '@robes/core/looks';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { useJob } from './use-job';
import { invalidateWardrobe } from './wardrobe';

// What the capture rack needs of the look's editor (lib/look-editor.ts).
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
  // What the read saw of a found row (its box, for the crop drawn from the photo).
  found: (row: RackRow) => ReadPiece | undefined;
  find: () => void;
  skip: () => void;
  match: (key: string, piece: Piece, how: 'match' | 'suggested' | 'add') => void;
  remove: (key: string) => void;
  undo: () => void;
}

// The Rack of a look from her photograph (Capture PRD 1c.3–1c.6): Find the pieces reads the
// look's photo; each found piece is a row she matches to a piece of hers, adds to her wardrobe or
// removes, and whatever is left unfiled stays on the look as a suggestion. The rows live on the
// look's own rack through its editor, so a draft writes through and a saved look waits for
// Update look. Native twin: mobile/src/features/looks/capture-rack.ts.
export function useCaptureRack(look: Look, editor: RackEditor): CaptureRack {
  const api = useApiClient();
  const queryClient = useQueryClient();
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
  const [removed, setRemoved] = useState<RemovedRow[]>([]);
  const [filed, setFiled] = useState<Record<string, Piece>>({});
  const [reads, setReads] = useState<Record<string, ReadPiece>>({});
  const { job, connection } = useJob(jobId);
  const current = useRef(rows);
  current.current = rows;

  const waiting = rows.some(isCaptureRow);
  const wardrobe = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: on && waiting });

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
    removed: removed.length,
    touched,
    suggested: (row) => {
      const id = row.proposal?.capture?.suggestedPieceId;
      const piece = id ? byId.get(id) : undefined;
      return piece && !rows.some((r) => r.pieceId === piece.id) ? piece : null;
    },
    pieceOf: (id) => filed[id],
    found: (row) => reads[row.key],
    find,
    skip: () => setSkipped(true),
    match: (key, piece, how) => {
      track('look_piece_filed', { how });
      setTouched(true);
      setFiled((f) => ({ ...f, [piece.id]: piece }));
      editor.setRows(fileRow(rows, key, pieceRow(piece, null)));
      // A piece added from the photo is new in her wardrobe: its grid and its count move.
      if (how === 'add') void invalidateWardrobe(queryClient);
    },
    remove: (key) => {
      track('look_piece_filed', { how: 'remove' });
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
