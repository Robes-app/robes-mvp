import 'server-only';
import { ApiError } from '@robes/api';
import {
  type AddBriefLineInput,
  type BriefLine,
  type ChooseSeasonInput,
  type Observation,
  type RecordMemoryInput,
  type StartJobOutput,
  StyleDna,
  type StyleProfile,
  type UpdateStyleDnaInput,
} from '@robes/contracts';
import { chooseSeason, iconTag, type SeasonName } from '@robes/core/style-dna';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { toImage } from './asset-urls';
import { repos } from './db';
import { startJob } from './jobs';
import { mediaDelivery } from './media';
import { toStyleProfile } from './style-profile';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const Colours = z.array(z.string()).catch([]).default([]);

type Snapshot = Awaited<ReturnType<typeof repos.styleDna.get>>;

// Robes reads on its own once, and again when the last read is a week old and nothing waits.
export function readDue(readAt: Date | null, waiting: number, now = Date.now()): boolean {
  if (waiting > 0) return false;
  return readAt === null || now - readAt.getTime() > WEEK_MS;
}

async function toStyleDna(userId: UserId, snap: Snapshot): Promise<StyleDna> {
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
    readDue: readDue(readAt, observations.length),
  });
}

export async function loadStyleDna(userId: UserId): Promise<StyleDna> {
  return toStyleDna(userId, await repos.styleDna.get(userId));
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

export async function addBriefLine(userId: UserId, input: AddBriefLineInput): Promise<StyleDna> {
  await repos.styleDna.addLine(userId, input.list, input.text, input.chip);
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
      ? await repos.styleDna.keepPending(userId, id)
      : await repos.styleDna.dismissPending(userId, id);
  if (!done) throw new ApiError('not_found');
  return loadStyleDna(userId);
}

export async function startBriefRead(userId: UserId, req: Request): Promise<StartJobOutput> {
  if (await repos.capacity.isExhausted(['gemini-flash-lite'])) throw new ApiError('capacity');
  return startJob(userId, req, {
    kind: 'style_brief',
    input: {},
    quota: { metric: 'generation.text', cost: 1 },
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
