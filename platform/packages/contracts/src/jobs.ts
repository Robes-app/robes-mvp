import { JOB_KINDS, JOB_STAGES, JOB_STATUSES } from '@robes/core/jobs';
import { z } from 'zod';
import { IdeaWay } from './looks';

export const JobStatus = z.enum(JOB_STATUSES);
export const JobStage = z.enum(JOB_STAGES);

// Stage payloads persisted on the job; the row is the durable truth clients resume from.
export const JobText = z.object({ title: z.string(), lines: z.array(z.string()) });
export const JobImage = z.object({
  idx: z.number().int().min(0),
  status: z.enum(['placeholder', 'pending', 'ready', 'failed', 'deferred']),
  // Null when a frame failed before it had an asset.
  assetId: z.uuid().nullable().optional(),
});
// Handlers merge their stage payloads into one object; every kind's fields are declared here so
// none are stripped on the way to the client.
export const JobOutput = z.object({
  text: JobText.optional(),
  images: z.array(JobImage).optional(),
  // key_piece
  ideaId: z.uuid().optional(),
  fallback: z.boolean().optional(),
  wearer: z.enum(['woman', 'man']).optional(),
  ways: z.array(IdeaWay).optional(),
  // wardrobe_analyse
  pieceId: z.uuid().optional(),
  label: z.string().optional(),
  category: z.string().optional(),
  noItemDetected: z.boolean().optional(),
  // stylenotes_analyse
  styleKind: z.enum(['colour', 'silhouette']).optional(),
  archetype: z.string().optional(),
  noSubject: z.boolean().optional(),
});

export const JobSnapshot = z.object({
  id: z.uuid(),
  kind: z.enum(JOB_KINDS),
  status: JobStatus,
  stage: JobStage,
  output: JobOutput,
  // Short code (e.g. `timeout`), never provider text; clients map it to copy.
  error: z.string().nullable(),
  cancelRequested: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
});
export type JobSnapshot = z.infer<typeof JobSnapshot>;

export const JobIdParams = z.object({ id: z.uuid() });

export const StartJobOutput = z.object({ jobId: z.uuid(), status: JobStatus });
export type StartJobOutput = z.infer<typeof StartJobOutput>;

// SSE on GET /api/v1/jobs/:id/events: each `job` event carries a full JobSnapshot.
export const JOB_EVENT = 'job';
