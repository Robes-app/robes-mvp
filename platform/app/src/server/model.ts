import 'server-only';
import { createHash } from 'node:crypto';
import { ApiError } from '@robes/api';
import { JobStatus, Model, type StartJobOutput, type UpdateModelInput } from '@robes/contracts';
import {
  cellKey,
  genericCellId,
  genericCellIds,
  HAIR_SWATCHES,
  hasTwinInputs,
  type ModelPicks,
  NO_ADJ,
  presenceOf,
  resolveModel,
  SKIN_SWATCHES,
  twinInputsOf,
  twinKey,
} from '@robes/core/avatar';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { signedRenditions } from './asset-urls';
import { repos } from './db';
import { isFlagEnabled } from './flags';
import { createAndEnqueueJob, startJob } from './jobs';
import { logger } from './logger';
import { mediaDelivery } from './media';

const DRAW_STALE_MS = 10 * 60_000;

// Stored picks are read defensively: anything malformed is ignored, never trusted.
const StoredPicks = z.object({
  skin: z.number().int().min(0).max(7).optional().catch(undefined),
  hair: z.number().int().min(0).max(4).optional().catch(undefined),
  line: z.enum(['soft', 'straight']).nullable().optional().catch(undefined),
  frame: z.enum(['fuller', 'narrower']).nullable().optional().catch(undefined),
});

const wearerOf = (g: string | null | undefined): 'woman' | 'man' =>
  presenceOf(g) === 'man' ? 'man' : 'woman';

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

type Row = Awaited<ReturnType<typeof current>>['row'];

// Her twin as the screens see it: the image on file (even while a redraw of newer inputs runs) and
// how the draw of what she has now stands.
async function signedAsset(userId: UserId, assetId: string | null) {
  const asset = assetId ? await repos.assets.getForUser(userId, assetId) : null;
  return {
    url: asset ? (await signedRenditions(mediaDelivery, userId, asset)).master : null,
    failed: asset?.status === 'failed',
  };
}

async function twinState(userId: UserId, row: Row, key: string, now = Date.now()) {
  const { url: imageUrl, failed } = await signedAsset(userId, row.twinAssetId);
  const current = row.twinKey === key && row.twinAssetId !== null;
  const drawing =
    row.twinDrawKey === key &&
    row.twinDrawStatus === 'pending' &&
    row.twinDrawAt !== null &&
    now - row.twinDrawAt.getTime() < DRAW_STALE_MS;
  // A drawn twin is pending until its renditions exist; one whose renditions failed has failed.
  const status = current
    ? imageUrl
      ? 'ready'
      : failed
        ? 'failed'
        : 'pending'
    : drawing
      ? 'pending'
      : row.twinDrawKey === key && row.twinDrawStatus === 'failed'
        ? 'failed'
        : 'none';
  return { status, current, imageUrl } as const;
}

export async function loadModel(userId: UserId): Promise<Model> {
  const { row, resolved } = await current(userId);
  const inputs = twinInputsOf(row);
  const [cell, twin, closeUp] = await Promise.all([
    repos.avatarCells.get(cellKey(resolved.cellId)),
    twinState(userId, row, await twinKey(inputs)),
    signedAsset(userId, row.headshotAssetId),
  ]);
  const imageUrl =
    cell?.status === 'ready' && cell.bucketKey ? await mediaDelivery.url(cell.bucketKey) : null;
  const stand = await standOf(row, twin.imageUrl);
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
    skinSet: inputs.skinSet,
    hairSet: inputs.hairSet,
    adj: inputs.adj,
    closeUpUrl: closeUp.url,
    twin,
    stand,
  });
}

// The model a new look stands on — the same one renderOnModel draws on (her twin, her filed cell,
// else the first generic Robes model).
async function standOf(row: Row, twinUrl: string | null) {
  if (row.filedCellId && row.twinAssetId && row.twinKey && twinUrl) {
    return { imageUrl: twinUrl, generic: false };
  }
  const cellId = row.filedCellId ?? genericCellId(wearerOf(row.genderIdentity), 0);
  const cell = await repos.avatarCells.get(cellKey(cellId));
  const imageUrl =
    cell?.status === 'ready' && cell.bucketKey ? await mediaDelivery.url(cell.bucketKey) : null;
  return { imageUrl, generic: row.filedCellId === null };
}

// Draws the portrait for a cell nobody has drawn yet (shared catalog); `start` makes the job.
async function ensureCell(
  cellId: string,
  start: (key: string) => Promise<StartJobOutput>,
): Promise<void> {
  const key = cellKey(cellId);
  // Kill switch for the paid draw only; her picks still save and the portrait waits.
  if (!(await isFlagEnabled('model.portraits'))) return;
  if (!(await repos.avatarCells.claim(key))) return;
  try {
    if (await repos.capacity.isExhausted(['gemini-image'])) throw new ApiError('capacity');
    const started = await start(key);
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

// With no model of her own, a set's three ways stand on three generic Robes models (legacy 0.4):
// their shared catalog portraits are drawn once ever (the claim), the first time anyone needs
// them. Not charged to her quota (it is Robes' catalog, six portraits in all), and never on her
// request's idempotency key, which belongs to the look she asked for.
export async function ensureGenericCells(userId: UserId): Promise<void> {
  const row = await repos.model.get(userId);
  if (!row || row.filedCellId !== null) return;
  for (const id of genericCellIds(wearerOf(row.genderIdentity))) {
    await ensureCell(id, (key) =>
      createAndEnqueueJob(userId, { kind: 'avatar_cell', input: { cellKey: key } }),
    );
  }
}

// Every pick re-files the model she sees (legacy auto-file) and makes sure its portrait exists.
export async function updateModel(
  userId: UserId,
  req: Request,
  input: UpdateModelInput,
): Promise<Model> {
  const { presence, adj, ...picks } = input;
  // A scale moved merges over the sliders as they stand (a legacy seed included); {} is "back to
  // your facts".
  const sliders =
    adj === undefined
      ? undefined
      : Object.keys(adj).length === 0
        ? NO_ADJ
        : { ...twinInputsOf((await current(userId)).row).adj, ...adj };
  await repos.model.savePicks(userId, sliders ? { ...picks, adj: sliders } : picks, presence);
  const { resolved } = await current(userId);
  await repos.model.file(userId, resolved.cellId, { source: resolved.source });
  await ensureCell(resolved.cellId, (key) =>
    startJob(userId, req, {
      kind: 'avatar_cell',
      input: { cellKey: key },
      quota: { metric: 'generation.image', cost: 1 },
    }),
  );
  return loadModel(userId);
}

// Draws her twin when what it is drawn from changed since the last (legacy mvTwinSync): asked on
// leaving a twin screen and on landing on the model, never per tap. One image quota per draw.
export async function drawTwin(userId: UserId, req: Request): Promise<Model> {
  const { row, resolved } = await current(userId);
  const inputs = twinInputsOf(row);
  if (!hasTwinInputs(inputs) || !(await isFlagEnabled('model.portraits'))) return loadModel(userId);
  if (row.filedCellId === null) {
    await repos.model.file(userId, resolved.cellId, { source: resolved.source });
  }
  const key = await twinKey(inputs);
  if (await repos.model.claimTwin(userId, key)) {
    try {
      if (await repos.capacity.isExhausted(['gemini-image'])) throw new ApiError('capacity');
      await startJob(userId, req, {
        kind: 'avatar_cell',
        input: { target: 'twin', twinKey: key },
        quota: { metric: 'generation.image', cost: 1 },
      });
    } catch (err) {
      // The model she has stands; the next visit may draw again.
      await repos.model.failTwin(userId, key);
      logger.warn(
        { reason: err instanceof ApiError ? err.code : 'start_failed' },
        'avatar_twin_not_started',
      );
    }
  }
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
  // A saved look renders on her model, and so does a draft while she builds it (the composer
  // dresses the model as pieces land, legacy 2026-09-03); Robes' frame is a look's picture and her
  // model never replaces it (legacy 2026-10-07).
  const look = await repos.looks.get(userId, lookId);
  if (!look || !['saved', 'draft'].includes(look.status) || look.frameAssetId) {
    throw new ApiError('conflict');
  }
  const row = await repos.model.get(userId);
  if (!row) throw new ApiError('conflict');
  // Her twin when she has one, else the catalog cell she filed; with no model of her own, the
  // first generic Robes model (legacy 2026-10-15, day 0) — its portrait drawn once ever.
  const twin = row.filedCellId && row.twinAssetId && row.twinKey ? `twin:${row.twinKey}` : null;
  const cellId = row.filedCellId ?? genericCellId(wearerOf(row.genderIdentity), 0);
  if (!twin) {
    const cell = await repos.avatarCells.get(cellKey(cellId));
    if (cell?.status !== 'ready') {
      if (!row.filedCellId) await ensureGenericCells(userId);
      throw new ApiError('conflict');
    }
  }
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
  // The key names the model it stands on, so the worker draws on exactly that one.
  const renderKey = `${twin ?? cellKey(cellId)}:${rack}`;

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
