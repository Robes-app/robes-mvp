import { type BatchProvider, parseBatchResult } from '@robes/ai';
import { FEATURE, Output } from '@robes/ai/prompts/daily';
import { GENDER_IDENTITIES } from '@robes/core/avatar';
import type { Repositories, SystemRepositories, UserId } from '@robes/db';
import { verifiedUserId } from '@robes/db';
import { z } from 'zod';
import {
  completeDaily,
  DAILY_MAX_OUTPUT_TOKENS,
  type DailyDeps,
  type DailyPlan,
  planDaily,
  recordCall,
} from './handlers/daily';
import type { JobLogger } from './logger';
import { enqueueJob } from './outbox';
import type { JobTransport } from './transport';

// The overnight Today look (M5 task 3, cost lever 4). Hourly: everyone at local 04:00 who was
// active this week gets a `daily` job; their prompts go to the Gemini Batch API at half price.
// batch-poll applies results through the same normalisation and storage as the interactive
// handler. If submission fails, a batch fails, or a result never comes, the job falls back to
// the interactive path (immediately, or when its lease lapses and the sweeper re-sends it).
export const OVERNIGHT_TICK_LIMIT = 500;

export interface OvernightDeps {
  overnight: SystemRepositories['overnight'];
  jobs: Pick<SystemRepositories['jobs'], 'writeStage' | 'finish'>;
  capacity: { isExhausted(families: readonly string[]): Promise<boolean> };
  daily: DailyDeps;
  batch: BatchProvider;
  transport: JobTransport;
  // Draws the anchor frame after a batch result lands (the batch worker holds no image grants).
  renderAnchor(userId: UserId, dailyLookId: string, idx: number): Promise<void>;
  logger: JobLogger;
  limit?: number;
}

// What's stored on the job so a later process can finish it exactly as it was asked.
const StoredPlan = z.object({
  closetIds: z.array(z.string()),
  weather: z
    .object({
      city: z.string().nullable(),
      month: z.string().nullable(),
      tempRange: z.string().nullable(),
      condition: z.string().nullable(),
    })
    .nullable(),
  gender: z.enum(GENDER_IDENTITIES),
  styleIcons: z.array(z.string()),
  homeCity: z.string().nullable(),
});
const OvernightInput = z.object({ plan: StoredPlan });

async function fallback(deps: OvernightDeps, jobIds: readonly string[], reason: string) {
  const released = await deps.overnight.releaseToInteractive(jobIds);
  for (const jobId of released) await enqueueJob(deps.transport, { jobId }, deps.logger);
  deps.logger.warn({ reason, jobs: released.length }, 'overnight_fallback');
}

export async function overnightTick(
  deps: OvernightDeps,
  now = new Date(),
  opts: { userIds?: readonly string[] } = {},
): Promise<{ selected: number; submitted: number }> {
  if (await deps.capacity.isExhausted(['gemini-flash-lite'])) {
    deps.logger.warn({}, 'overnight_skipped_capacity');
    return { selected: 0, submitted: 0 };
  }
  const people = await deps.overnight.candidates({
    now,
    limit: deps.limit ?? OVERNIGHT_TICK_LIMIT,
    userIds: opts.userIds,
  });
  const requests: { key: string; system: string; user: string; maxOutputTokens: number }[] = [];
  for (const p of people) {
    try {
      const plan: DailyPlan = await planDaily(
        { ...deps.daily, now: () => now },
        verifiedUserId(p.userId),
        {},
      );
      const stored: z.infer<typeof StoredPlan> = {
        closetIds: plan.closetIds,
        weather: plan.weather,
        gender: plan.gender,
        styleIcons: plan.styleIcons,
        homeCity: plan.homeCity,
      };
      const jobId = await deps.overnight.createJob(p.userId, p.localDate, { plan: stored });
      if (!jobId) continue;
      requests.push({
        key: jobId,
        system: plan.system,
        user: plan.user,
        maxOutputTokens: DAILY_MAX_OUTPUT_TOKENS,
      });
    } catch (err) {
      deps.logger.warn(
        { reason: err instanceof Error ? err.message : 'unknown' },
        'overnight_plan_failed',
      );
    }
  }
  if (requests.length === 0) return { selected: people.length, submitted: 0 };
  try {
    const { batchId } = await deps.batch.submit({
      feature: FEATURE,
      capability: 'text.fast',
      schema: Output,
      requests,
    });
    await deps.overnight.recordSubmission({
      provider: deps.batch.name,
      providerBatchId: batchId,
      feature: FEATURE,
      jobIds: requests.map((r) => r.key),
    });
    deps.logger.info({ jobs: requests.length }, 'overnight_submitted');
    return { selected: people.length, submitted: requests.length };
  } catch {
    await fallback(
      deps,
      requests.map((r) => r.key),
      'submit_failed',
    );
    return { selected: people.length, submitted: 0 };
  }
}

export async function pollOvernight(
  deps: OvernightDeps,
): Promise<{ applied: number; failed: number }> {
  let applied = 0;
  let failed = 0;
  for (const sub of await deps.overnight.open()) {
    const res = await deps.batch.poll(sub.providerBatchId, sub.jobIds);
    if (res.state === 'running') continue;
    if (res.state === 'failed') {
      await deps.overnight.finishSubmission(sub.id, 'failed');
      await fallback(deps, sub.jobIds, 'batch_failed');
      continue;
    }
    const answered = new Set<string>();
    for (const result of res.results) {
      answered.add(result.key);
      const job = await deps.overnight.claimForApply(result.key);
      if (!job) continue;
      const run = {
        jobId: job.id,
        userId: verifiedUserId(job.userId),
        signal: AbortSignal.timeout(120_000),
        writeStage: (stage: 'text' | 'images', output: Record<string, unknown>) =>
          deps.jobs.writeStage(job.id, stage, output),
      };
      await recordCall(deps.daily, run, result.usage, result.text ? 'ok' : 'error');
      const stored = OvernightInput.safeParse(job.input);
      const output = parseBatchResult(Output, result);
      if (!stored.success || !output) {
        await deps.jobs.finish(job.id, { status: 'failed', error: 'ai_invalid_output' });
        failed++;
        continue;
      }
      try {
        const done = await completeDaily(deps.daily, run, stored.data.plan, output, {
          rawInput: job.input,
          deferAnchor: (dailyLookId, idx) => deps.renderAnchor(run.userId, dailyLookId, idx),
        });
        await deps.jobs.finish(job.id, done);
        applied++;
      } catch (err) {
        await deps.jobs.finish(job.id, {
          status: 'failed',
          error: err instanceof Error ? err.message.slice(0, 60) : 'apply_failed',
        });
        failed++;
      }
    }
    await deps.overnight.finishSubmission(sub.id, 'applied');
    const missing = sub.jobIds.filter((id) => !answered.has(id));
    if (missing.length) await fallback(deps, missing, 'missing_result');
  }
  if (applied || failed) deps.logger.info({ applied, failed }, 'overnight_applied');
  return { applied, failed };
}

// Starts the look_render job for a deferred anchor frame, as the on-demand path does for her —
// without charging her quota, since Robes made this look unasked.
export function createAnchorRenderer(deps: {
  repos: Pick<Repositories, 'frames' | 'jobs'>;
  transport: JobTransport;
  logger: JobLogger;
}) {
  return async (userId: UserId, dailyLookId: string, idx: number): Promise<void> => {
    if (!(await deps.repos.frames.claim(userId, dailyLookId, 'daily_look', idx))) return;
    try {
      const { job } = await deps.repos.jobs.create(userId, {
        kind: 'look_render',
        input: { target: 'daily', dailyLookId, itemIdx: idx },
      });
      await deps.repos.frames.setJob(userId, dailyLookId, 'daily_look', idx, job.id);
      await enqueueJob(deps.transport, { jobId: job.id }, deps.logger);
    } catch (err) {
      await deps.repos.frames.release(userId, dailyLookId, 'daily_look', idx);
      throw err;
    }
  };
}
