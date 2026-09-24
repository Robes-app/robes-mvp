import 'server-only';
import { ApiError } from '@robes/api';
import {
  DailyLook,
  type Look,
  type StartJobOutput,
  type TodayGenerateInput,
} from '@robes/contracts';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { toImage } from './asset-urls';
import { repos } from './db';
import { startJob } from './jobs';
import { toLook } from './looks-entity';
import { mediaDelivery } from './media';
import { toPieces } from './wardrobe';

// What the daily job stores in artifacts.data (packages/jobs handlers/daily.ts, NormalLook).
const StoredItem = z.object({
  name: z.string(),
  category: z.string(),
  brand: z.string(),
  how: z.string(),
  pieceId: z.string().nullable(),
  retailerHint: z.string(),
  pricePoint: z.string(),
  alternates: z.array(
    z.object({
      name: z.string(),
      brand: z.string(),
      retailerHint: z.string(),
      pricePoint: z.string(),
    }),
  ),
  imageIndex: z.number().int(),
});
const StoredDaily = z.object({
  look: z.object({
    fallback: z.boolean(),
    occasionLabel: z.string(),
    headline: z.string(),
    stylistSummary: z.string(),
    transitionTip: z.string(),
    palette: z.array(z.string()),
    lookTags: z.object({
      climate: z.string(),
      wearFor: z.array(z.string()),
      vibe: z.array(z.string()),
    }),
    steps: z.array(
      z.object({ title: DailyLook.shape.steps.element.shape.title, items: z.array(StoredItem) }),
    ),
  }),
  weather: DailyLook.shape.weather.default(null),
  images: z
    .array(
      z.object({
        idx: z.number().int(),
        assetId: z.uuid().nullable(),
        status: z.enum(['ready', 'failed']),
      }),
    )
    .default([]),
});

type Row = NonNullable<Awaited<ReturnType<typeof repos.dailyLooks.get>>>;

// Text and one image call: both spent together, like style-a-piece.
const TODAY_QUOTA = [
  { metric: 'generation.text', cost: 1 },
  { metric: 'generation.image', cost: 1 },
] as const;

export async function generateToday(
  userId: UserId,
  req: Request,
  input: TodayGenerateInput,
): Promise<StartJobOutput> {
  if (await repos.capacity.isExhausted(['gemini-flash-lite', 'gemini-image'])) {
    throw new ApiError('capacity');
  }
  // Locked pieces must be hers; someone else's is indistinguishable from a missing one.
  for (const id of new Set(input.lockedPieceIds ?? [])) {
    if (!(await repos.wardrobe.get(userId, id))) throw new ApiError('not_found');
  }
  return startJob(userId, req, { kind: 'daily', input, quota: [...TODAY_QUOTA] });
}

export async function toDailyLook(userId: UserId, row: Row): Promise<DailyLook> {
  const stored = StoredDaily.parse(row.data);
  const pieceIds = [
    ...new Set(
      stored.look.steps.flatMap((s) => s.items.flatMap((i) => (i.pieceId ? [i.pieceId] : []))),
    ),
  ];
  const pieceRows = (
    await Promise.all(pieceIds.map((id) => repos.wardrobe.get(userId, id)))
  ).filter((p) => p !== undefined);
  const pieces = new Map((await toPieces(userId, pieceRows)).map((p) => [p.id, p]));
  const frameAssets = stored.images.flatMap((f) =>
    f.assetId && f.status === 'ready' ? [f.assetId] : [],
  );
  const assets = new Map(
    (await repos.assets.getManyForUser(userId, frameAssets)).map((a) => [a.id, a]),
  );
  const frames = new Map<number, Awaited<ReturnType<typeof toImage>>>();
  for (const f of stored.images) {
    const asset = f.assetId ? assets.get(f.assetId) : undefined;
    if (asset) frames.set(f.idx, await toImage(mediaDelivery, userId, asset));
  }
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  return DailyLook.parse({
    id: row.id,
    jobId: row.generationJobId,
    ...stored.look,
    weather: stored.weather,
    steps: stored.look.steps.map((s) => ({
      title: s.title,
      items: s.items.map((i) => ({
        name: i.name,
        category: i.category,
        brand: i.brand,
        how: i.how,
        // A piece she has since deleted drops back to a suggestion.
        piece: (i.pieceId && pieces.get(i.pieceId)) || null,
        retailerHint: i.retailerHint,
        pricePoint: i.pricePoint,
        alternates: i.alternates,
        image: frames.get(i.imageIndex) ?? null,
      })),
    })),
    savedAt: row.savedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

export async function loadDailyLook(userId: UserId, id: string): Promise<DailyLook> {
  const row = await repos.dailyLooks.get(userId, id);
  if (!row) throw new ApiError('not_found');
  return toDailyLook(userId, row);
}

// Naming the daily look makes it a real Look: her owned pieces in step order, the anchor frame
// as its render, the stylist's note. The draft is then kept (legacy "nothing saved until named").
export async function saveDailyLook(userId: UserId, id: string, name: string): Promise<Look> {
  const row = await repos.dailyLooks.get(userId, id);
  if (!row) throw new ApiError('not_found');
  const stored = StoredDaily.parse(row.data);
  const ids = [
    ...new Set(
      stored.look.steps.flatMap((s) => s.items.flatMap((i) => (i.pieceId ? [i.pieceId] : []))),
    ),
  ];
  const owned = (await Promise.all(ids.map((pid) => repos.wardrobe.get(userId, pid)))).filter(
    (p) => p !== undefined,
  );
  const anchor = stored.look.steps.find((s) => s.title === 'The Anchor')?.items[0];
  const anchorIdx = anchor?.imageIndex;
  const render =
    stored.images.find((f) => f.idx === anchorIdx && f.status === 'ready')?.assetId ?? null;
  const look = await repos.looks.create(userId, {
    name,
    nameProvisional: false,
    note: stored.look.stylistSummary.slice(0, 2000) || null,
    pieces: owned.map((p, i) => ({
      pieceId: p.id,
      role: i === 0 && ids[0] === p.id ? 'anchor' : null,
    })),
    source: 'today',
    renderAssetId: render,
  });
  await repos.dailyLooks.markSaved(userId, id);
  return toLook(userId, look);
}
