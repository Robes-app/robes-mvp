import 'server-only';
import { ApiError } from '@robes/api';
import {
  JobStatus,
  type LookAskInput,
  LookSet,
  type PromptLookInput,
  type StartJobOutput,
} from '@robes/contracts';
import { lookDateName } from '@robes/core/calendar';
import { frameKey } from '@robes/core/looks';
import { DraftsFull, type UserId } from '@robes/db';
import { z } from 'zod';
import { repos } from './db';
import { startJob } from './jobs';
import { toLook, toLooks } from './looks-entity';
import { ensureGenericCells } from './model';
import { todayIn } from './plan';

// Look states (docs/look-states-brief.md) and the look prompt (docs/look-prompt-brief.md).

// One text call and the first frame, spent together; the other frames when she reaches them.
const SET_QUOTA = [
  { metric: 'generation.text', cost: 1 },
  { metric: 'generation.image', cost: 1 },
] as const;
const TEXT_FAMILIES = ['gemini-flash-lite'];
const IMAGE_FAMILIES = ['gemini-image', 'gemini-image-lite'];

export async function draftsFull<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    // Five drafts wait; she lets the oldest go (letGoOldest) or keeps them.
    if (err instanceof DraftsFull) {
      throw new ApiError('conflict', { details: { reason: 'drafts_full' } });
    }
    throw err;
  }
}

// A hand-built draft she never named saves as her today ("Wednesday 28 Oct"), provisional (beta
// rule, legacy history 2026-10-05). Robes' looks keep Robes' name.
export async function saveLook(
  userId: UserId,
  id: string,
  name: string | undefined,
  now = new Date(),
) {
  const look = await repos.looks.get(userId, id);
  if (!look) throw new ApiError('not_found');
  let datedName: string | undefined;
  if (name === undefined && isUnnamedHandBuilt(look)) {
    const profile = await repos.profiles.get(userId);
    if (profile) datedName = lookDateName(todayIn(profile.timezone, now));
  }
  return toLook(userId, await repos.looks.save(userId, id, { name, datedName }));
}

export function isUnnamedHandBuilt(look: {
  status: string;
  nameProvisional: boolean;
  source: string;
  setId: string | null;
}): boolean {
  return look.status === 'draft' && look.nameProvisional && look.source === 'manual' && !look.setId;
}

// Her words for a day → three suggested looks on the deck (legacy __rbPromptLook, 2026-10-09).
export async function promptLook(
  userId: UserId,
  req: Request,
  input: PromptLookInput,
): Promise<StartJobOutput> {
  if (await repos.capacity.isExhausted([...TEXT_FAMILIES, ...IMAGE_FAMILIES])) {
    throw new ApiError('capacity');
  }
  await ensureGenericCells(userId);
  return startJob(userId, req, {
    kind: 'key_piece',
    input: { mode: 'prompt', ...input },
    quota: [...SET_QUOTA],
  });
}

// ↻ on a suggestion: that one look re-written in place, its frame drawn again.
export async function restyleLook(
  userId: UserId,
  req: Request,
  id: string,
): Promise<StartJobOutput> {
  const look = await repos.looks.get(userId, id);
  if (!look) throw new ApiError('not_found');
  if (look.status !== 'suggested' || !look.setId) throw new ApiError('conflict');
  if (await repos.capacity.isExhausted([...TEXT_FAMILIES, ...IMAGE_FAMILIES])) {
    throw new ApiError('capacity');
  }
  return startJob(userId, req, {
    kind: 'key_piece',
    input: { mode: 'restyle', lookId: id },
    quota: [...SET_QUOTA],
  });
}

const StoredProposals = z
  .array(z.looseObject({ name: z.string(), brand: z.string().default('') }))
  .catch([]);

// Robes' frame for the rack as it stands: a suggestion's first frame when she reaches it (lazy,
// UX-09), or the frame re-dressed after an edit. Asking again for the same rack returns its job.
export async function requestFrame(
  userId: UserId,
  req: Request,
  id: string,
): Promise<StartJobOutput> {
  const look = await repos.looks.get(userId, id);
  if (!look) throw new ApiError('not_found');
  // Only a look Robes framed has a frame to draw; her own looks render on her model instead.
  if (!look.frameAssetId && !look.setId) throw new ApiError('conflict');
  const pieces = await repos.looks.piecesFor(userId, [id]);
  const propsCount = StoredProposals.parse(look.proposals ?? []).length;
  if (pieces.length === 0 && propsCount === 0) throw new ApiError('invalid_input');
  const key = frameKey(
    pieces.map((p) => p.id),
    StoredProposals.parse(look.proposals ?? []),
    z
      .record(z.string(), z.string())
      .catch({})
      .parse(look.styling ?? {}),
  );
  if (!(await repos.looks.claimFrame(userId, id, key))) {
    const again = await repos.looks.renderState(userId, id);
    const job = again?.renderJobId
      ? await repos.jobs.getForUser(userId, again.renderJobId)
      : undefined;
    if (!job) throw new ApiError('conflict');
    return { jobId: job.id, status: JobStatus.parse(job.status) };
  }
  try {
    if (await repos.capacity.isExhausted(IMAGE_FAMILIES)) throw new ApiError('capacity');
    const started = await startJob(userId, req, {
      kind: 'look_render',
      input: { target: 'frame', lookId: id, frameKey: key },
      quota: { metric: 'generation.image', cost: 1 },
    });
    await repos.looks.setRenderJob(userId, id, started.jobId);
    return started;
  } catch (err) {
    await repos.looks.releaseRender(userId, id);
    throw err;
  }
}

// The look prompt: one flash call; the edit comes back as the job's output.
export async function askLook(
  userId: UserId,
  req: Request,
  id: string,
  input: LookAskInput,
): Promise<StartJobOutput> {
  if (!(await repos.looks.get(userId, id))) throw new ApiError('not_found');
  if (await repos.capacity.isExhausted(TEXT_FAMILIES)) throw new ApiError('capacity');
  return startJob(userId, req, {
    kind: 'look_ask',
    input: { ...input, lookId: id },
    quota: { metric: 'generation.text', cost: 1 },
  });
}

const SetData = z.object({
  mode: z.enum(['piece', 'prompt']).catch('piece'),
  prompt: z.string().nullable().catch(null),
  dateHint: z.iso.date().nullable().catch(null),
  anchor: z.object({ type: z.string(), pieceId: z.uuid().optional() }).nullable().catch(null),
});

export async function loadSet(userId: UserId, setId: string): Promise<LookSet> {
  const idea = await repos.ideas.getSet(userId, setId);
  if (!idea) throw new ApiError('not_found');
  const data = SetData.parse(idea.data);
  const looks = await toLooks(userId, await repos.looks.listSet(userId, setId));
  const anchorId = data.anchor?.type === 'piece' ? data.anchor.pieceId : undefined;
  const anchor = looks.find((l) => l.anchor?.id === anchorId)?.anchor ?? null;
  return LookSet.parse({
    id: idea.id,
    mode: data.mode,
    prompt: data.prompt,
    anchor,
    dateHint: data.dateHint,
    jobId: idea.generationJobId,
    looks,
  });
}
