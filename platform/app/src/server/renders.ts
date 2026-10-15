import 'server-only';
import { ApiError } from '@robes/api';
import { JobStatus, type LookRenderInput, type StartJobOutput } from '@robes/contracts';
import type { FramedType, UserId } from '@robes/db';
import { repos } from './db';
import { startJob } from './jobs';

// Frames render on demand (UX-09): one image call each, charged only when a frame actually
// starts rendering. Asking for a frame that's ready or already rendering returns its job.
export async function requestRender(
  userId: UserId,
  req: Request,
  target: { type: FramedType; id: string; idx: number; input: LookRenderInput },
): Promise<StartJobOutput> {
  const { type, id, idx } = target;
  if (!(await repos.frames.claim(userId, id, type, idx))) {
    const frame = await repos.frames.frame(userId, id, type, idx);
    const row = frame ? undefined : await repos.frames.get(userId, id, type);
    if (!frame && !row) throw new ApiError('not_found');
    const jobId = frame?.jobId ?? row?.generationJobId;
    if (frame?.status === 'ready' && jobId) return { jobId, status: 'succeeded' };
    const job = jobId ? await repos.jobs.getForUser(userId, jobId) : undefined;
    // Claimed a moment ago by another request that hasn't recorded its job yet.
    if (!job) throw new ApiError('conflict');
    return { jobId: job.id, status: JobStatus.parse(job.status) };
  }
  try {
    if (await repos.capacity.isExhausted(['gemini-image', 'gemini-image-lite'])) {
      throw new ApiError('capacity');
    }
    const started = await startJob(userId, req, {
      kind: 'look_render',
      input: target.input,
      quota: { metric: 'generation.image', cost: 1 },
    });
    await repos.frames.setJob(userId, id, type, idx, started.jobId);
    return started;
  } catch (err) {
    // Nothing started: give the frame back so she can ask again.
    await repos.frames.release(userId, id, type, idx);
    throw err;
  }
}
