import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { JobSnapshot } from '@robes/contracts';
import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isTerminal, JOB_REFRESH_MS } from '@/features/looks/ideas';
import type { PickedPhoto } from '../add-pieces';
import { type ReviewShot, startRead } from './flow';

// Each photo's read, polled until it settles (no SSE on native yet; the job row is the truth).
export function useReadJobs(jobIds: readonly string[]): Map<string, JobSnapshot> {
  const api = useApiClient();
  const results = useQueries({
    queries: jobIds.map((id) => ({
      queryKey: queryKeys.call('jobs.get', { params: { id } }),
      queryFn: () => api.call('jobs.get', { params: { id } }),
      refetchInterval: (q: { state: { data: JobSnapshot | undefined } }) =>
        isTerminal(q.state.data) ? false : JOB_REFRESH_MS,
    })),
  });
  const out = new Map<string, JobSnapshot>();
  results.forEach((r, i) => {
    const id = jobIds[i];
    if (id && r.data) out.set(id, r.data);
  });
  return out;
}

export const piecesIn = (job: JobSnapshot | undefined): number =>
  job && (job.status === 'succeeded' || job.status === 'partial')
    ? (job.output.readPieces?.length ?? 0)
    : 0;

export interface SessionShot extends ReviewShot {
  key: string;
  failed?: boolean;
}

// The photos of one session (the camera's shots, a roll pick): each uploads and starts its read
// the moment it lands, so Review opens on reads already under way.
export function useShotSession(initial: readonly ReviewShot[] = []) {
  const api = useApiClient();
  const seq = useRef(0);
  const [shots, setShots] = useState<SessionShot[]>(() =>
    initial.map((s) => ({ ...s, key: `s${seq.current++}` })),
  );
  // One upload at a time, in the order she took or picked them (the read route is rate-limited).
  const queue = useRef<Promise<void>>(Promise.resolve());
  const start = useCallback(
    (key: string, photo: PickedPhoto) => {
      queue.current = queue.current.then(async () => {
        try {
          const jobId = await startRead(api, photo);
          setShots((all) => all.map((s) => (s.key === key ? { ...s, jobId } : s)));
        } catch {
          setShots((all) => all.map((s) => (s.key === key ? { ...s, failed: true } : s)));
        }
      });
      return queue.current;
    },
    [api],
  );
  // Photos handed in without a read yet (the camera roll) start theirs once, on arrival.
  const begun = useRef(false);
  useEffect(() => {
    if (begun.current) return;
    begun.current = true;
    for (const s of shots) if (!s.jobId) void start(s.key, s);
  }, [shots, start]);
  const add = useCallback(
    (photo: PickedPhoto & { width: number; height: number }) => {
      const key = `s${seq.current++}`;
      setShots((all) => [
        ...all,
        { key, uri: photo.uri, width: photo.width, height: photo.height },
      ]);
      return start(key, photo);
    },
    [start],
  );
  const jobs = useReadJobs(shots.flatMap((s) => (s.jobId ? [s.jobId] : [])));
  const settled = (s: SessionShot) => s.failed || (s.jobId ? isTerminal(jobs.get(s.jobId)) : false);
  const reading = shots.some((s) => !settled(s));
  const found = shots.reduce((n, s) => n + (s.jobId ? piecesIn(jobs.get(s.jobId)) : 0), 0);
  return { shots, add, jobs, reading, found };
}
