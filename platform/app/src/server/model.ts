import 'server-only';
import { ApiError } from '@robes/api';
import {
  type DeleteTwinInput,
  JobStatus,
  Model,
  type RedrawLookInput,
  type StartJobOutput,
  type UpdateModelInput,
} from '@robes/contracts';
import {
  catalogKey,
  cellKey,
  genericCellIds,
  HAIR_SWATCHES,
  hasTwinInputs,
  isTwinCurrent,
  type ModelPicks,
  NO_ADJ,
  presenceOf,
  resolveModel,
  robesModelIds,
  SKIN_SWATCHES,
  standOf,
  type TwinInputs,
  twinInputsOf,
  twinKey,
  wearerOf,
} from '@robes/core/avatar';
import type { CreateJobInput, UserId } from '@robes/db';
import { z } from 'zod';
import { signedRenditions } from './asset-urls';
import { repos } from './db';
import { isFlagEnabled } from './flags';
import { createAndEnqueueJob, startJob } from './jobs';
import { logger } from './logger';
import { mediaDelivery } from './media';
import { writePictureNote } from './picture-note';
import { rackHash } from './render-key';

const DRAW_STALE_MS = 10 * 60_000;
// Longer than any colour read runs (its budget is 90s): an older one still "running" was lost.
const READ_STALE_MS = 5 * 60_000;

// Stored picks are read defensively: anything malformed is ignored, never trusted.
const StoredPicks = z.object({
  skin: z.number().int().min(0).max(7).optional().catch(undefined),
  hair: z
    .number()
    .int()
    .min(0)
    .max(HAIR_SWATCHES.length - 1)
    .optional()
    .catch(undefined),
  line: z.enum(['soft', 'straight']).nullable().optional().catch(undefined),
  frame: z.enum(['fuller', 'narrower']).nullable().optional().catch(undefined),
});

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

async function twinState(userId: UserId, row: Row, inputs: TwinInputs, now = Date.now()) {
  const key = await twinKey(inputs);
  const { url: imageUrl, failed } = await signedAsset(userId, row.twinAssetId);
  const current = row.twinAssetId !== null && (await isTwinCurrent(row.twinKey, inputs));
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
    twinState(userId, row, inputs),
    signedAsset(userId, row.headshotAssetId),
  ]);
  const imageUrl =
    cell?.status === 'ready' && cell.bucketKey ? await mediaDelivery.url(cell.bucketKey) : null;
  const [stand, robesModels, generics] = await Promise.all([
    standView(row, twin.imageUrl),
    robesModelsOf(row),
    genericsOf(row),
  ]);
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
    preset: row.modelPreset,
    robesModels,
    generics,
  });
}

// A catalog portrait's signed-free URL once drawn (catalog/ is public, no user data in it).
async function portraitOf(cellId: string) {
  const cell = await repos.avatarCells.get(catalogKey(cellId));
  const imageUrl =
    cell?.status === 'ready' && cell.bucketKey ? await mediaDelivery.url(cell.bucketKey) : null;
  return { status: cell?.status ?? ('none' as const), imageUrl };
}

// The five Robes models for her wearer (plan 2026-11-05), each with its portrait once drawn.
async function robesModelsOf(row: Row) {
  return Promise.all(
    robesModelIds(wearerOf(row.genderIdentity)).map(async (id, i) => ({
      id,
      n: i + 1,
      ...(await portraitOf(id)),
    })),
  );
}

// The three legacy generic cells, for phone builds installed before the Robes models; nothing new
// reads them, and nothing draws them any more.
async function genericsOf(row: Row) {
  return Promise.all(
    genericCellIds(wearerOf(row.genderIdentity)).map(async (id) => {
      const cell = await repos.avatarCells.get(cellKey(id));
      const imageUrl =
        cell?.status === 'ready' && cell.bucketKey ? await mediaDelivery.url(cell.bucketKey) : null;
      return { id, imageUrl };
    }),
  );
}

// The model a new look stands on — the same one renderOnModel draws on (standOf: her twin, her
// hand-built cell, else the Robes model she chose or the first). A twin whose picture isn't
// delivered yet stands aside until it is.
async function standView(row: Row, twinUrl: string | null) {
  const stand = standOf(twinUrl ? row : { ...row, twinAssetId: null });
  if (stand.on === 'twin') return { imageUrl: twinUrl, generic: false, on: stand.on };
  const { imageUrl } = await portraitOf(stand.cellId);
  return { imageUrl, generic: stand.on === 'robes', on: stand.on };
}

// Draws the portrait for a cell nobody has drawn yet (shared catalog); `start` makes the job.
async function ensureCell(
  cellId: string,
  start: (key: string) => Promise<StartJobOutput>,
): Promise<void> {
  const key = catalogKey(cellId);
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

// While her looks stand on a Robes model, the five for her wearer are drawn once ever (the claim),
// the first time anyone needs them (plan 2026-11-05; legacy 0.4 for the three generics). Not
// charged to her quota (it is Robes' catalog, ten portraits in all), and never on her request's
// idempotency key, which belongs to the look she asked for.
export async function ensureRobesModels(userId: UserId): Promise<void> {
  const row = await repos.model.get(userId);
  if (!row || standOf(row).on !== 'robes') return;
  for (const id of robesModelIds(wearerOf(row.genderIdentity))) {
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
  const { presence, adj, preset, ...picks } = input;
  // A Robes model chosen (or given up): her looks stand on it from now; its portrait is drawn if
  // nobody has yet. Nothing else about her model changes.
  if (preset !== undefined) {
    await repos.model.savePreset(userId, preset);
    await ensureRobesModels(userId);
  }
  const shaped = adj !== undefined || Object.keys(picks).length > 0;
  if (!shaped && presence === undefined) return loadModel(userId);
  // Colouring and Body shape are the twin's (plan 2026-11-05 Q9): a Robes model is not hers to
  // shape. Her own model (twin or hand-built cell) stands again when she picks it in the lineup.
  const onRobes = standOf((await current(userId)).row).on === 'robes';
  if (shaped && preset === undefined && onRobes) throw new ApiError('conflict');
  // Her gender alone, on a Robes model (Style DNA › You, Annie 7 Nov): her looks move to that
  // wearer's five. Nothing is filed and no cell is drawn for her, or she would leave the lineup.
  if (!shaped && onRobes) {
    await repos.model.savePicks(userId, {}, presence);
    await ensureRobesModels(userId);
    return loadModel(userId);
  }
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
  // Landing on her model also draws her wearer's Robes models if nobody has yet (an account
  // onboarded before they were drawn at onboarding).
  await ensureRobesModels(userId);
  const { row, resolved } = await current(userId);
  const inputs = twinInputsOf(row);
  if (!hasTwinInputs(inputs) || !(await isFlagEnabled('model.portraits'))) return loadModel(userId);
  // While her colour read runs, her selfie's twin is already being drawn (drawTwinFromSelfie): a
  // draw of what is on file now would take its place.
  if (await colourReading(userId)) return loadModel(userId);
  if (row.filedCellId === null) {
    await repos.model.file(userId, resolved.cellId, { source: resolved.source });
  }
  if (!(await isTwinCurrent(row.twinKey, inputs))) {
    const key = await twinKey(inputs);
    const claimed = await repos.model.claimTwin(userId, key);
    // A twin drawn anew is hers to stand on (a selfie after a Robes model: the selfie wins),
    // whether this ask started it or her selfie did.
    const drawing = claimed || (row.twinDrawKey === key && row.twinDrawStatus === 'pending');
    if (drawing && row.modelPreset !== null) await repos.model.savePreset(userId, null);
    if (claimed) await startTwin(userId, key, (job) => startJob(userId, req, job));
  }
  return loadModel(userId);
}

// Deletes her digital twin (Annie, 12 Nov 2026; repo model.deleteTwin): her looks then stand on
// a Robes model again, drawn if nobody has yet.
export async function deleteTwin(userId: UserId, input: DeleteTwinInput): Promise<Model> {
  await repos.model.deleteTwin(userId, input.source);
  await ensureRobesModels(userId);
  return loadModel(userId);
}

// Her selfie's twin, started with its colour read rather than after it (10 Nov 2026): the
// photograph carries her face, skin and hair, so the read is not needed to draw it, only to say
// the photo is hers. The worker keeps the twin once the read has taken the photo, and throws it
// away on no face or a failed read. The ask after the read finds it drawing and starts nothing.
export async function drawTwinFromSelfie(
  userId: UserId,
  req: Request,
  selfie: { closeUpAssetId: string; readJobId: string },
): Promise<void> {
  if (!(await isFlagEnabled('model.portraits'))) return;
  const { row } = await current(userId);
  const inputs = { ...twinInputsOf(row), closeUpAssetId: selfie.closeUpAssetId };
  if (await isTwinCurrent(row.twinKey, inputs)) return;
  const key = await twinKey(inputs);
  if (!(await repos.model.claimTwin(userId, key))) return;
  // Its own job, never the read's Idempotency-Key: that would hand back the read.
  await startTwin(
    userId,
    key,
    (job) => createAndEnqueueJob(userId, job, req.headers.get('traceparent') ?? undefined),
    selfie,
  );
}

async function startTwin(
  userId: UserId,
  key: string,
  start: (job: Omit<CreateJobInput, 'idempotencyKey' | 'traceId'>) => Promise<unknown>,
  early?: { closeUpAssetId: string; readJobId: string },
): Promise<void> {
  try {
    if (await repos.capacity.isExhausted(['gemini-image'])) throw new ApiError('capacity');
    await start({
      kind: 'avatar_cell',
      input: { target: 'twin', twinKey: key, ...(early ? { early } : {}) },
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

async function colourReading(userId: UserId, now = Date.now()): Promise<boolean> {
  const read = await repos.jobs.latest(userId, 'stylenotes_analyse');
  return (
    read !== undefined &&
    (read.status === 'queued' || read.status === 'running') &&
    (read.input as { kind?: unknown } | null)?.kind === 'colour' &&
    now - read.createdAt.getTime() < READ_STALE_MS
  );
}

// "See it on me": one render per model and rack; asking again returns the same job.
export async function renderOnModel(
  userId: UserId,
  req: Request,
  lookId: string,
  input: RedrawLookInput = {},
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
  // Her twin when she stands on it, else the cell she built by hand, else the Robes model she
  // chose or the first (standOf) — a Robes model's portrait drawn once ever.
  const stand = standOf(row);
  const model = stand.on === 'twin' ? `twin:${row.twinKey}` : catalogKey(stand.cellId);
  if (stand.on !== 'twin') {
    const cell = await repos.avatarCells.get(model);
    if (cell?.status !== 'ready') {
      if (stand.on === 'robes') await ensureRobesModels(userId);
      throw new ApiError('conflict');
    }
  }
  const pieces = await repos.looks.piecesFor(userId, [lookId]);
  if (pieces.length === 0) throw new ApiError('invalid_input');
  // Her picture note (D21) is written first, so the job reads it and the key holds it; sent, it
  // asks for a fresh picture even when nothing else changed.
  const pictureNote = await writePictureNote(userId, lookId, input.note, look.pictureNote);
  // How each piece is worn is part of what the render shows, so a changed note re-renders once.
  const notes = look.styling && typeof look.styling === 'object' ? look.styling : {};
  const rack = rackHash(pieces, notes as Record<string, unknown>, pictureNote);
  // The key names the model it stands on, so the worker draws on exactly that one.
  const renderKey = `${model}:${rack}`;

  if (
    !(await repos.looks.claimRender(userId, lookId, renderKey, { force: input.note !== undefined }))
  ) {
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
