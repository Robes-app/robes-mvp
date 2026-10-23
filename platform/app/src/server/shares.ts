import 'server-only';
import { ApiError } from '@robes/api';
import { type Share, SharedLook } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { RenditionManifest, renditionKeys } from '@robes/media';
import { z } from 'zod';
import { repos } from './db';
import { env } from './env';
import { mediaDelivery } from './media';
import { rateLimiter } from './route';

// What a snapshot stores about an image: enough to sign its renditions, nothing else.
const SnapshotImage = z.object({
  assetId: z.uuid(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  blurhash: z.string().nullable(),
  renditions: RenditionManifest,
});
type SnapshotImage = z.infer<typeof SnapshotImage>;

const LookSnapshot = z.object({
  v: z.literal(1),
  type: z.literal('look'),
  name: z.string(),
  note: z.string().nullable(),
  by: z.string().nullable(),
  image: SnapshotImage.nullable(),
  pieces: z.array(
    z.object({ label: z.string(), category: z.string(), image: SnapshotImage.nullable() }),
  ),
});

type AssetRow = Awaited<ReturnType<typeof repos.assets.getManyForUser>>[number];
function snapshotImage(asset: AssetRow | undefined): SnapshotImage | null {
  const manifest = RenditionManifest.safeParse(asset?.renditions);
  if (!asset || asset.status !== 'ready' || !manifest.success) return null;
  return {
    assetId: asset.id,
    width: asset.width,
    height: asset.height,
    blurhash: asset.blurhash,
    renditions: manifest.data,
  };
}

export function shareUrl(token: string): string {
  return new URL(`/share/${token}`, env.BETTER_AUTH_URL).toString();
}

// Snapshot at share time: later edits to the look don't change what the link shows.
export async function shareLook(userId: UserId, lookId: string): Promise<Share> {
  const look = await repos.looks.get(userId, lookId);
  // Only a look she kept is shared; a suggestion or a draft is saved first.
  if (!look || look.status !== 'saved') throw new ApiError('not_found');
  const [pieces, profile] = await Promise.all([
    repos.looks.piecesFor(userId, [look.id]),
    repos.profiles.get(userId),
  ]);
  const assetIds = [
    ...(look.renderAssetId ? [look.renderAssetId] : []),
    ...pieces.flatMap((p) => (p.imageAssetId ? [p.imageAssetId] : [])),
  ];
  const assets = new Map(
    (await repos.assets.getManyForUser(userId, assetIds)).map((a) => [a.id, a]),
  );
  const snapshot = LookSnapshot.parse({
    v: 1,
    type: 'look',
    name: look.name,
    note: look.note,
    by: profile?.firstName ?? null,
    image: snapshotImage(look.renderAssetId ? assets.get(look.renderAssetId) : undefined),
    pieces: pieces.map((p) => ({
      label: p.label,
      category: p.category,
      image: snapshotImage(p.imageAssetId ? assets.get(p.imageAssetId) : undefined),
    })),
  });
  const share = await repos.shares.create(userId, {
    subjectType: 'look',
    subjectId: look.id,
    snapshot,
  });
  return {
    token: share.token,
    url: shareUrl(share.token),
    createdAt: share.createdAt.toISOString(),
  };
}

async function signImage(ownerId: string, image: SnapshotImage | null) {
  if (!image) return null;
  const keys = renditionKeys(ownerId, image.assetId, image.renditions);
  return {
    width: image.width,
    height: image.height,
    blurhash: image.blurhash,
    renditions: await Promise.all(
      keys.renditions.map(async (r) => ({
        width: r.width,
        avif: await mediaDelivery.shareUrl(r.avif),
        webp: await mediaDelivery.shareUrl(r.webp),
      })),
    ),
  };
}

// Public: only the snapshot's whitelisted fields leave, with short-lived image URLs.
export async function viewShare(token: string): Promise<SharedLook> {
  const row = await repos.publicShares.view(token);
  const snapshot = LookSnapshot.safeParse(row?.snapshot);
  if (!row || !snapshot.success) throw new ApiError('not_found');
  const s = snapshot.data;
  return SharedLook.parse({
    type: 'look',
    name: s.name,
    note: s.note,
    by: s.by,
    image: await signImage(row.ownerId, s.image),
    pieces: await Promise.all(
      s.pieces.map(async (p) => ({
        label: p.label,
        category: p.category,
        image: await signImage(row.ownerId, p.image),
      })),
    ),
    sharedAt: row.createdAt.toISOString(),
  });
}

// What scripts/migrate's shareSnapshot kept of a legacy board: words only, never images.
const LegacySnapshot = z.object({
  v: z.literal(1),
  legacy: z.literal(true),
  title: z.string(),
  subtitle: z.string().nullish(),
  headline: z.string().nullish(),
  ways: z
    .array(
      z.object({ title: z.string(), scene: z.string().nullish(), outfit: z.string().nullish() }),
    )
    .nullish(),
  steps: z
    .array(z.object({ items: z.array(z.object({ name: z.string() })).default([]) }))
    .nullish(),
});

export const SharedLegacy = z.object({
  name: z.string(),
  note: z.string().nullable(),
  ways: z.array(z.object({ title: z.string(), text: z.string() })),
  pieces: z.array(z.string()),
});
export type SharedLegacy = z.infer<typeof SharedLegacy>;

// A migrated `/board/<id>` link (data-model.md §5): 40-bit tokens, so a tight per-IP limit. Over
// the limit, an unknown, expired or non-legacy token all read the same: not found.
export async function viewLegacyShare(token: string, ip: string): Promise<SharedLegacy | null> {
  const limited = await rateLimiter.limit(`public.legacy-shares:${ip}`, 30, 60);
  if (!limited.success) return null;
  const row = await repos.publicShares.view(token);
  const snapshot = LegacySnapshot.safeParse(row?.snapshot);
  if (!row?.legacyToken || !snapshot.success) return null;
  const s = snapshot.data;
  return SharedLegacy.parse({
    name: s.title,
    note: s.headline || s.subtitle || null,
    ways: (s.ways ?? []).map((w) => ({ title: w.title, text: w.scene || w.outfit || '' })),
    pieces: (s.steps ?? []).flatMap((step) => step.items.map((i) => i.name)).filter(Boolean),
  });
}
