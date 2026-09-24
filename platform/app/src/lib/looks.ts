import type { Idea, JobSnapshot } from '@robes/contracts';
import type { ProgressStage } from '@robes/ui';

const FRAME_WAIT_MS = 5 * 60_000;

// Frames land after the job (renditions run on the upload event), so keep checking while any
// frame is still coming — but never forever for an idea whose images never started.
export function ideaNeedsRefresh(idea: Idea | undefined, now = Date.now()): boolean {
  if (!idea) return false;
  const young = now - Date.parse(idea.createdAt) < FRAME_WAIT_MS;
  if (idea.frames.length === 0) return young;
  return young && idea.frames.some((f) => f.status === 'pending');
}

export function jobProgressStage(job: JobSnapshot | null): ProgressStage {
  if (!job || job.stage === 'queued' || job.stage === 'text') return 'styling';
  if (job.stage === 'images') return 'dressing';
  return 'finishing';
}

export function daysLeft(expiresAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 86_400_000));
}
