'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Piece, ReadPiece } from '@robes/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePhotoFiling } from './file-photo';
import { usePhotoRead } from './photo-read';
import { invalidateWardrobe } from './wardrobe';

// The first piece (legacy 2026-10-17, 0.8): the photo runs the multi-piece read first. One piece
// files as before; several ask which one first — that one is styled, the others file quietly. A
// read that fails or finds nothing falls back to the single read.
export function useFirstPiece() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const read = usePhotoRead('wardrobe');
  const single = usePhotoFiling();
  const [chosen, setChosen] = useState<Piece | null>(null);
  const [filing, setFiling] = useState(false);
  const [error, setError] = useState(false);
  const photo = useRef<File | null>(null);
  const handled = useRef<string | null>(null);

  const fileRead = useCallback(
    async (jobId: string, pieces: ReadPiece[], pick: number) => {
      setFiling(true);
      setError(false);
      try {
        const out = await api.call('photoReads.file', {
          params: { id: jobId },
          input: { answers: pieces.map((p) => ({ index: p.index, state: 'add' as const })) },
        });
        // Filed pieces come back in the read's order.
        const order = pieces.map((p) => p.index).sort((a, b) => a - b);
        const piece = out.filed[order.indexOf(pick)] ?? out.filed[0] ?? null;
        void invalidateWardrobe(queryClient);
        if (!piece) throw new Error('nothing_filed');
        setChosen(piece);
      } catch {
        setError(true);
      } finally {
        setFiling(false);
      }
    },
    [api, queryClient],
  );

  const { status, jobId, pieces } = read;
  const fileSingle = single.file;
  useEffect(() => {
    const key = `${jobId}:${status}`;
    if (handled.current === key) return;
    if (status === 'failed' || (status === 'done' && pieces.length === 0)) {
      handled.current = key;
      if (photo.current) void fileSingle(photo.current);
    } else if (status === 'done' && jobId && pieces.length === 1) {
      handled.current = key;
      void fileRead(jobId, pieces, pieces[0]?.index ?? 0);
    }
  }, [status, jobId, pieces, fileSingle, fileRead]);

  const resetRead = read.reset;
  const resetSingle = single.reset;
  const reset = useCallback(() => {
    handled.current = null;
    photo.current = null;
    resetRead();
    resetSingle();
    setChosen(null);
    setError(false);
  }, [resetRead, resetSingle]);

  const startRead = read.start;
  const start = useCallback(
    (f: File) => {
      reset();
      photo.current = f;
      void startRead(f);
    },
    [reset, startRead],
  );

  const s = single.filing;
  const stalled = read.errorCode === 'asset_not_ready' || read.errorCode === 'asset_missing';

  const piece = chosen ?? (s.phase === 'filed' ? s.piece : null);
  const singleReading = s.phase === 'uploading' || s.phase === 'reading';
  // Several pieces wait for her pick (once nothing is filed yet).
  const choices =
    status === 'done' && pieces.length > 1 && !chosen && !filing && s.phase === 'idle'
      ? pieces
      : null;
  return {
    piece,
    choices,
    reading: !piece && !choices && (status === 'reading' || filing || singleReading),
    preview: read.photoUrl ?? (s.phase !== 'idle' && s.phase !== 'none' ? s.preview : null),
    // 'none': nothing to file in the photo; 'stalled': the photo never finished preparing, so
    // "no piece" would be a lie; 'failed': it could not be read or filed.
    problem: stalled
      ? 'stalled'
      : error || s.phase === 'failed'
        ? 'failed'
        : s.phase === 'none'
          ? 'none'
          : null,
    choose: (index: number) => (jobId ? void fileRead(jobId, pieces, index) : undefined),
    start,
    reset,
  };
}
