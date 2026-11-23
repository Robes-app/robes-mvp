import type { AdminUserDetail, AdminUserRecords } from '@robes/contracts';

type Job = AdminUserDetail['jobs'][number];
type Call = AdminUserRecords['calls'][number];

export interface GenerationRow {
  key: string;
  at: string;
  job: Job | null;
  // Oldest first, the order they ran in.
  calls: Call[];
  costMicros: number;
}

// Beta's generations table: one row per job with the model calls it made, newest first. Calls
// from a job older than the recent jobs list, or outside any job, keep a row of their own.
export function generationRows(jobs: Job[], calls: Call[]): GenerationRow[] {
  const byJob = new Map<string, Call[]>();
  const loose: Call[] = [];
  for (const c of calls) {
    if (c.jobId) byJob.set(c.jobId, [...(byJob.get(c.jobId) ?? []), c]);
    else loose.push(c);
  }
  const row = (key: string, job: Job | null, cs: Call[], at: string): GenerationRow => {
    const ordered = [...cs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      key,
      at,
      job,
      calls: ordered,
      costMicros: ordered.reduce((sum, c) => sum + c.costMicros, 0),
    };
  };
  const rows = jobs.map((j) => {
    const cs = byJob.get(j.id) ?? [];
    byJob.delete(j.id);
    return row(j.id, j, cs, j.createdAt);
  });
  for (const [id, cs] of byJob) rows.push(row(id, null, cs, earliest(cs)));
  for (const c of loose) rows.push(row(c.id, null, [c], c.createdAt));
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

const earliest = (cs: Call[]) =>
  cs.reduce((min, c) => (c.createdAt < min ? c.createdAt : min), '~');

// "7.8s" for a call chip.
export const seconds = (ms: number | null): string | null =>
  ms === null ? null : `${(ms / 1000).toFixed(1)}s`;
