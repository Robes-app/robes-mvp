import 'server-only';
import { createHash } from 'node:crypto';
import { ApiError } from '@robes/api';
import { JobStatus, Model, type StartJobOutput, type UpdateModelInput } from '@robes/contracts';
import {
  cellKey,
  HAIR_SWATCHES,
  type ModelPicks,
  type Presence,
  resolveModel,
  SKIN_SWATCHES,
} from '@robes/core/avatar';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { repos } from './db';
import { isFlagEnabled } from './flags';
import { startJob } from './jobs';
import { logger } from './logger';
import { mediaDelivery } from './media';

// Stored picks are read defensively: anything malformed is ignored, never trusted.
const StoredPicks = z.object({
  skin: z.number().int().min(0).max(7).optional().catch(undefined),
  hair: z.number().int().min(0).max(4).optional().catch(undefined),
  line: z.enum(['soft', 'straight']).nullable().optional().catch(undefined),
  frame: z.enum(['fuller', 'narrower']).nullable().optional().catch(undefined),
});

function presenceOf(genderIdentity: string | null | undefined): Presence {
  return genderIdentity === 'man' || genderIdentity === 'unspecified' ? genderIdentity : 'woman';
}

async function current(userId: UserId) {
  const row = await repos.model.get(userId);
  if (!row) throw new ApiError('not_found');
  const picks: ModelPicks = StoredPicks.catch({}).parse(row.avatarPrefs ?? {});
  const resolved = resolveModel(presenceOf(row.genderIdentity), picks, {
    skinHex: row.skinHex,
    hairHex: row.hairHex,
    bodyType: row.bodyType,
  });
  return { row, resolved };
}

export async function loadModel(userId: UserId): Promise<Model> {
  const { row, resolved } = await current(userId);
  const cell = await repos.avatarCells.get(cellKey(resolved.cellId));
  const imageUrl =
    cell?.status === 'ready' && cell.bucketKey ? await mediaDelivery.url(cell.bucketKey) : null;
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  return Model.parse({
    filed: row.filedCellId !== null,
    presence: resolved.presence,
    skin: resolved.skin,
    hair: resolved.hair,
    line: resolved.line,
    frame: resolved.frame,
    source: resolved.source,
    reads: { colour: row.colourRead, silhouette: row.silhouetteRead },
    cellId: resolved.cellId,
    cell: { status: cell?.status ?? 'none', imageUrl },
    swatches: { skin: [...SKIN_SWATCHES], hair: [...HAIR_SWATCHES] },
  });
}

// Draws the portrait for a cell nobody has drawn yet (shared catalog; one image quota for her).
async function ensureCell(userId: UserId, req: Request, cellId: string): Promise<void> {
  const key = cellKey(cellId);
  // Kill switch for the paid draw only; her picks still save and the portrait waits.
  if (!(await isFlagEnabled('model.portraits'))) return;
  if (!(await repos.avatarCells.claim(key))) return;
  try {
    if (await repos.capacity.isExhausted(['gemini-image'])) throw new ApiError('capacity');
    const started = await startJob(userId, req, {
      kind: 'avatar_cell',
      input: { cellKey: key },
      quota: { metric: 'generation.image', cost: 1 },
    });
    await repos.avatarCells.setJob(key, started.jobId);
  } catch (err) {
    // Her picks still save; the portrait can be drawn on the next change or visit.
    await repos.avatarCells.fail(key);
    logger.warn(
      { reason: err instanceof ApiError ? err.code : 'start_failed' },
      'avatar_cell_not_started',
    );
  }
}

// Every pick re-files the model she sees (legacy auto-file) and makes sure its portrait exists.
export async function updateModel(
  userId: UserId,
  req: Request,
  input: UpdateModelInput,
): Promise<Model> {
  const { presence, ...picks } = input;
  await repos.model.savePicks(userId, picks, presence);
  const { resolved } = await current(userId);
  await repos.model.file(userId, resolved.cellId, { source: resolved.source });
  await ensureCell(userId, req, resolved.cellId);
  return loadModel(userId);
}

// "See it on me": one render per model and rack; asking again returns the same job.
export async function renderOnModel(
  userId: UserId,
  req: Request,
  lookId: string,
): Promise<StartJobOutput> {
  const state = await repos.looks.renderState(userId, lookId);
  if (!state) throw new ApiError('not_found');
  // Only a saved look renders on her model; Robes' frame is a look's picture and her model never
  // replaces it (legacy 2026-10-07).
  const look = await repos.looks.get(userId, lookId);
  if (!look || look.status !== 'saved' || look.frameAssetId) throw new ApiError('conflict');
  const row = await repos.model.get(userId);
  if (!row?.filedCellId) throw new ApiError('conflict');
  const cell = await repos.avatarCells.get(cellKey(row.filedCellId));
  if (cell?.status !== 'ready') throw new ApiError('conflict');
  const pieces = await repos.looks.piecesFor(userId, [lookId]);
  if (pieces.length === 0) throw new ApiError('invalid_input');
  // How each piece is worn is part of what the render shows, so a changed note re-renders once.
  const notes = look.styling && typeof look.styling === 'object' ? look.styling : {};
  const rack = createHash('sha256')
    .update(
      pieces.map((p) => `${p.id}~${(notes as Record<string, unknown>)[p.id] ?? ''}`).join(','),
    )
    .digest('base64url')
    .slice(0, 22);
  const renderKey = `${cellKey(row.filedCellId)}:${rack}`;

  if (!(await repos.looks.claimRender(userId, lookId, renderKey))) {
    const again = await repos.looks.renderState(userId, lookId);
    const job = again?.renderJobId
      ? await repos.jobs.getForUser(userId, again.renderJobId)
      : undefined;
    // Claimed a moment ago by another request that hasn't recorded its job yet.
    if (!job) throw new ApiError('conflict');
    return { jobId: job.id, status: JobStatus.parse(job.status) };
  }
  try {
    if (await repos.capacity.isExhausted(['gemini-image'])) throw new ApiError('capacity');
    const started = await startJob(userId, req, {
      kind: 'look_render',
      input: { target: 'look', lookId, renderKey },
      quota: { metric: 'generation.image', cost: 1 },
    });
    await repos.looks.setRenderJob(userId, lookId, started.jobId);
    return started;
  } catch (err) {
    await repos.looks.releaseRender(userId, lookId);
    throw err;
  }
}
