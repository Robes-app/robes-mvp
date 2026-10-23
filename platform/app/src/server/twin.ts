import 'server-only';
import { ApiError } from '@robes/api';
import {
  type AddBriefLineInput,
  type BriefLine,
  type ChooseSeasonInput,
  JobStatus,
  type Observation,
  type RecordMemoryInput,
  type StartJobOutput,
  StyleDna,
  type StyleProfile,
  type UpdateStyleDnaInput,
} from '@robes/contracts';
import { chooseSeason, iconTag, type SeasonName } from '@robes/core/style-dna';
import { BriefListFull, type UserId } from '@robes/db';
import { z } from 'zod';
import { toImage } from './asset-urls';
import { repos } from './db';
import { startJob } from './jobs';
import { mediaDelivery } from './media';
import { WARDROBE_READ } from './observations-flag';
import { toStyleProfile } from './style-profile';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// A read that failed isn't retried on every visit (each spends quota): the next waits this long.
export const READ_BACKOFF_MS = 6 * 60 * 60 * 1000;
const Colours = z.array(z.string()).catch([]).default([]);

type Snapshot = Awaited<ReturnType<typeof repos.styleDna.get>>;

// Robes reads on its own once, and again when the last read is a week old and nothing waits; a
// read that failed backs off for READ_BACKOFF_MS.
export function readDue(
  readAt: Date | null,
  waiting: number,
  now = Date.now(),
  failedAt: Date | null = null,
): boolean {
  if (!WARDROBE_READ || waiting > 0) return false;
  if (failedAt && now - failedAt.getTime() < READ_BACKOFF_MS) return false;
  return readAt === null || now - readAt.getTime() > WEEK_MS;
}

type LastRead = Awaited<ReturnType<typeof repos.jobs.latest>>;
const failedAt = (last: LastRead): Date | null =>
  last?.status === 'failed' ? (last.finishedAt ?? last.updatedAt) : null;
const inFlight = (last: LastRead): boolean =>
  last?.status === 'queued' || last?.status === 'running';

async function toStyleDna(userId: UserId, snap: Snapshot, last: LastRead): Promise<StyleDna> {
  const { profile, style, lines, heroes } = snap;
  const overrides = (style?.userOverrides ?? {}) as Record<string, unknown>;
  const kept = (list: BriefLine['list']): BriefLine[] =>
    lines
      .filter((l) => l.state === 'kept' && l.list === list)
      .map((l) => ({
        id: l.id,
        list,
        text: l.text,
        source: l.source as BriefLine['source'],
        chip: l.chip,
        keptAt: (l.keptAt ?? l.createdAt).toISOString(),
      }));
  const observations: Observation[] = lines
    .filter((l) => l.state === 'pending')
    .map((l) => ({
      id: l.id,
      list: l.list as Observation['list'],
      text: l.text,
      because: l.because,
      origin: l.origin === 'prompt' ? 'prompt' : 'read',
    }));
  const assetIds = heroes.flatMap((h) => (h.imageAssetId ? [h.imageAssetId] : []));
  const assets = new Map(
    (await repos.assets.getManyForUser(userId, assetIds)).map((a) => [a.id, a]),
  );
  const pieces = await Promise.all(
    heroes.map(async (h) => {
      const asset = h.imageAssetId ? assets.get(h.imageAssetId) : undefined;
      return {
        id: h.id,
        label: h.label,
        category: h.category,
        brand: h.brand,
        image: asset ? await toImage(mediaDelivery, userId, asset) : null,
      };
    }),
  );
  const readAt = style?.briefReadAt ?? null;
  return StyleDna.parse({
    types: profile?.styleArchetypes ?? [],
    brands: profile?.styleBrands ?? [],
    icons: (profile?.styleIcons ?? []).map((name) => ({ name, tag: iconTag(name) })),
    investment: profile?.investmentLevel ?? null,
    facts: {
      heightCm: profile?.heightCm ?? null,
      sizeUk: profile?.sizeUk ?? null,
      shoeUk: profile?.shoeUk ?? null,
      ageBand: profile?.ageBand ?? null,
      bustBand: profile?.bustBand ?? null,
      bustCup: profile?.bustCup ?? null,
      bustCm: profile?.bustCm ?? null,
      waistCm: profile?.waistCm ?? null,
    },
    gender: profile?.genderIdentity ?? 'woman',
    pieces,
    brief: {
      loves: kept('loves'),
      avoids: kept('avoids'),
      rules: kept('rules'),
      notes: style?.briefNotes ?? '',
      colours: {
        loved: Colours.parse(overrides.loved_colors),
        rejected: Colours.parse(overrides.rejected_colors),
      },
    },
    observations,
    readAt: readAt?.toISOString() ?? null,
    // A read in flight stays due, so a fresh mount follows it (the start returns the same job).
    readDue: readDue(readAt, observations.length, Date.now(), failedAt(last)),
  });
}

export async function loadStyleDna(userId: UserId): Promise<StyleDna> {
  const [snap, last] = await Promise.all([
    repos.styleDna.get(userId),
    repos.jobs.latest(userId, 'style_brief'),
  ]);
  return toStyleDna(userId, snap, last);
}

export async function updateStyleDna(
  userId: UserId,
  input: UpdateStyleDnaInput,
): Promise<StyleDna> {
  // Deduped by name, her order kept.
  const unique = (a: string[] | undefined) =>
    a?.filter((n, i) => a.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
  await repos.styleDna.updateTaste(userId, {
    styleArchetypes: unique(input.types),
    styleBrands: unique(input.brands),
    styleIcons: unique(input.icons),
    investmentLevel: input.investment,
  });
  if (input.facts) await repos.styleDna.setFacts(userId, input.facts);
  return loadStyleDna(userId);
}

// A full list (BRIEF_KEPT_MAX kept lines) is a 409 the clients name as brief_list_full.
async function withRoom<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (err instanceof BriefListFull) {
      throw new ApiError('conflict', { details: { reason: 'brief_list_full' } });
    }
    throw err;
  }
}

export async function addBriefLine(userId: UserId, input: AddBriefLineInput): Promise<StyleDna> {
  await withRoom(() => repos.styleDna.addLine(userId, input.list, input.text, input.chip));
  return loadStyleDna(userId);
}

export async function removeBriefLine(userId: UserId, id: string): Promise<StyleDna> {
  if (!(await repos.styleDna.removeLine(userId, id))) throw new ApiError('not_found');
  return loadStyleDna(userId);
}

export async function answerObservation(
  userId: UserId,
  id: string,
  answer: 'keep' | 'dismiss',
): Promise<StyleDna> {
  const done =
    answer === 'keep'
      ? await withRoom(() => repos.styleDna.keepPending(userId, id))
      : await repos.styleDna.dismissPending(userId, id);
  if (!done) throw new ApiError('not_found');
  return loadStyleDna(userId);
}

// Idempotent: a read in flight is returned, not started again; a read that isn't due (or failed
// within READ_BACKOFF_MS) is a 409, so repeat visits never spend quota.
export async function startBriefRead(userId: UserId, req: Request): Promise<StartJobOutput> {
  const [snap, last] = await Promise.all([
    repos.styleDna.get(userId),
    repos.jobs.latest(userId, 'style_brief'),
  ]);
  if (last && inFlight(last)) return { jobId: last.id, status: JobStatus.parse(last.status) };
  const waiting = snap.lines.filter((l) => l.state === 'pending').length;
  if (!readDue(snap.style?.briefReadAt ?? null, waiting, Date.now(), failedAt(last))) {
    throw new ApiError('conflict');
  }
  if (await repos.capacity.isExhausted(['gemini-flash-lite'])) throw new ApiError('capacity');
  return startJob(userId, req, {
    kind: 'style_brief',
    input: {},
    quota: { metric: 'generation.text', cost: 1 },
    singleFlight: true,
  });
}

export async function chooseStyleSeason(
  userId: UserId,
  input: ChooseSeasonInput,
): Promise<StyleProfile> {
  const current = await repos.styleProfile.colourDna(userId);
  if (!current?.colorHarmony) throw new ApiError('not_found');
  const { render, dna } = chooseSeason(input.season as SeasonName, current.colorHarmony);
  const row = await repos.styleProfile.chooseSeason(userId, {
    season: dna.archetype_name,
    undertone: dna.verified_undertone,
    contrast: dna.calculated_contrast,
    dna,
    render,
  });
  if (!row) throw new ApiError('not_found');
  return toStyleProfile(row);
}

export async function recordMemory(userId: UserId, input: RecordMemoryInput): Promise<void> {
  await repos.styleMemory.record(userId, {
    kind: input.kind,
    surface: input.surface ?? null,
    subject: input.subject ?? null,
    lookId: input.lookId ?? null,
    body: input.kind === 'swap' ? null : (input.body ?? null),
    verdict: input.kind === 'verdict' ? input.verdict : null,
    pieceOut: input.kind === 'swap' ? (input.pieceOut ?? null) : null,
    pieceIn: input.kind === 'swap' ? (input.pieceIn ?? null) : null,
    category: input.kind === 'swap' ? (input.category ?? null) : null,
  });
}
