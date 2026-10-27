'use client';

import type { ApiClient } from '@robes/api-client';
import { useApiClient } from '@robes/api-client/react';
import type { JobSnapshot } from '@robes/contracts';
import { type AddDestination, isDestination } from '@robes/core/add-flow';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { followJob } from './follow-job';
import { PHOTO_ACCEPT, uploadPhoto } from './upload';

// Add a piece, end to end (design "Add Piece — Handoff"): every way in carries where the pieces
// go, and every photo becomes a read Review walks through. Native twin:
// mobile/src/features/wardrobe/add/flow.ts + reads.ts.

export type { AddDestination };

// Photos one Review takes at once: each is its own read, and reads are rate-limited (20/min).
export const REVIEW_MAX = 12;

export function destinationOf(raw: unknown): AddDestination {
  return isDestination(raw) ? raw : 'wardrobe';
}

export function wardrobeHref(to: AddDestination): string {
  return to === 'wishlist' ? '/wardrobe/wishlist' : '/wardrobe';
}

export const isPhoto = (file: File): boolean => PHOTO_ACCEPT.split(',').includes(file.type);

// One photo → direct upload → its read job (Robes counts what's in the frame).
export async function startRead(api: ApiClient, file: File): Promise<string> {
  const asset = await uploadPhoto(api, file);
  const read = await api.call('photoReads.start', { input: { assetId: asset.id } });
  return read.jobId;
}

// The photo's own size, for cropping a piece out of it; a frame that can't be read is square.
export async function naturalSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = url;
  });
}

export interface SessionShot {
  key: string;
  // A local object URL: shown at once, never re-downloaded.
  url: string;
  width: number;
  height: number;
  // The photo itself, so a read that never lands can still be filled in by hand.
  file?: File;
  jobId?: string;
  failed?: boolean;
}

// Each photo's read, followed live (lib/follow-job.ts: SSE, the row when the stream can't). A
// read she can't have counts as settled with nothing in it.
export function useReadJobs(jobIds: readonly string[]): {
  jobs: Map<string, JobSnapshot>;
  lost: ReadonlySet<string>;
} {
  const api = useApiClient();
  const [jobs, setJobs] = useState<Map<string, JobSnapshot>>(() => new Map());
  const [lost, setLost] = useState<ReadonlySet<string>>(() => new Set());
  const followed = useRef(new Map<string, { close(): void }>());
  const key = jobIds.join(',');

  // biome-ignore lint/correctness/useExhaustiveDependencies: the joined key is the list.
  useEffect(() => {
    for (const id of jobIds) {
      if (followed.current.has(id)) continue;
      followed.current.set(
        id,
        followJob(api, id, {
          onJob: (job) => setJobs((all) => new Map(all).set(id, job)),
          onLost: () => setLost((all) => new Set(all).add(id)),
        }),
      );
    }
  }, [api, key]);

  useEffect(() => {
    const open = followed.current;
    return () => {
      for (const f of open.values()) f.close();
      open.clear();
    };
  }, []);

  return { jobs, lost };
}

export const piecesIn = (job: JobSnapshot | undefined): number =>
  job && (job.status === 'succeeded' || job.status === 'partial')
    ? (job.output.readPieces?.length ?? 0)
    : 0;

export interface ShotSession {
  shots: SessionShot[];
  jobs: Map<string, JobSnapshot>;
  add(file: File): Promise<void>;
  reset(): void;
  reading: boolean;
  found: number;
}

// The photos of one session (the camera's shots, a roll pick): each uploads and starts its read
// the moment it lands, so Review opens on reads already under way.
export function useShotSession(): ShotSession {
  const api = useApiClient();
  const seq = useRef(0);
  const [shots, setShots] = useState<SessionShot[]>([]);
  // One upload at a time, in the order she took or picked them (the read route is rate-limited).
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Each photo's object URL lives as long as the session shows it.
  const urls = useRef(new Set<string>());
  const add = useCallback(
    async (file: File) => {
      const key = `s${seq.current++}`;
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      // In the session at once (so it counts as reading), its size once the photo has loaded.
      setShots((all) => [...all, { key, url, width: 1, height: 1, file }]);
      void naturalSize(url).then((size) =>
        setShots((all) => all.map((s) => (s.key === key ? { ...s, ...size } : s))),
      );
      queue.current = queue.current.then(async () => {
        try {
          const jobId = await startRead(api, file);
          setShots((all) => all.map((s) => (s.key === key ? { ...s, jobId } : s)));
        } catch {
          setShots((all) => all.map((s) => (s.key === key ? { ...s, failed: true } : s)));
        }
      });
      return queue.current;
    },
    [api],
  );
  const reset = useCallback(() => {
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    setShots([]);
  }, []);
  useEffect(() => reset, [reset]);
  const { jobs, lost } = useReadJobs(shots.flatMap((s) => (s.jobId ? [s.jobId] : [])));
  const settled = (s: SessionShot) =>
    !!s.failed || (s.jobId ? lost.has(s.jobId) || isTerminal(jobs.get(s.jobId)) : false);
  const reading = shots.some((s) => !settled(s));
  const found = shots.reduce((n, s) => n + (s.jobId ? piecesIn(jobs.get(s.jobId)) : 0), 0);
  return { shots, jobs, add, reset, reading, found };
}

// How long Review waits on a read before offering to fill it in by hand (redline 01). A result
// that lands later still opens Review.
export const READ_PATIENCE_MS = 20_000;

export const isTerminal = (job: JobSnapshot | undefined): job is JobSnapshot =>
  !!job && isTerminalJobStatus(job.status);
