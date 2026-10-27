import 'server-only';
import { ApiError } from '@robes/api';
import { Edits, Look, LookRole, LookStatus, Proposal, Styling } from '@robes/contracts';
import { looks as copy } from '@robes/copy';
import { LookPiecesNotFound, type UserId } from '@robes/db';
import { z } from 'zod';
import { toImage } from './asset-urls';
import { repos } from './db';
import { mediaDelivery } from './media';
import { toPieces } from './wardrobe';

const Proposals = z.array(z.unknown()).catch([]);
// A proposal as legacy stored it (a shop row: the chosen option of a few, its role, saved = ♡).
const LegacyProposal = z.object({
  role: z.string().nullable().optional(),
  cats: z.array(z.string()).optional(),
  opts: z
    .array(
      z.looseObject({
        name: z.string(),
        brand: z.string().nullable().optional(),
        retailer_hint: z.string().nullable().optional(),
        price_point: z.string().nullable().optional(),
      }),
    )
    .min(1),
  oi: z.number().int().optional(),
  saved: z.boolean().optional(),
});
const LEGACY_ROLES: Record<string, Proposal['role']> = {
  'the canvas': 'canvas',
  'the anchor': 'anchor',
  'the texture': 'texture',
  'the exclamation point': 'exclamation',
};
// Stored rows are read leniently: a malformed one drops rather than failing the whole look.
function proposalsOf(raw: unknown): Proposal[] {
  return Proposals.parse(raw ?? []).flatMap((p, i) => {
    const parsed = Proposal.safeParse(p);
    if (parsed.success) return [parsed.data];
    const legacy = LegacyProposal.safeParse(p);
    if (!legacy.success) return [];
    const opt = legacy.data.opts[legacy.data.oi ?? 0] ?? legacy.data.opts[0];
    const shaped = Proposal.safeParse({
      key: `p-legacy${i}`,
      name: opt?.name,
      category: legacy.data.cats?.[0] ?? 'Other',
      brand: opt?.brand ?? '',
      retailerHint: opt?.retailer_hint ?? '',
      pricePoint: opt?.price_point ?? '',
      role: LEGACY_ROLES[(legacy.data.role ?? '').toLowerCase()] ?? null,
      wishlisted: legacy.data.saved === true,
    });
    return shaped.success ? [shaped.data] : [];
  });
}
const ROBES_SOURCES = new Set(['generated', 'today', 'travel']);

type LookRow = NonNullable<Awaited<ReturnType<typeof repos.looks.get>>>;

const CLAIM_MS = 10 * 60_000;

export async function toLooks(userId: UserId, rows: LookRow[], now = Date.now()): Promise<Look[]> {
  const ids = rows.map((r) => r.id);
  const renderIds = rows.flatMap((r) => {
    const ids = [r.frameAssetId, r.renderAssetId, r.photoAssetId];
    return ids.filter((id): id is string => id !== null);
  });
  const anchorIds = [...new Set(rows.flatMap((r) => (r.anchorPieceId ? [r.anchorPieceId] : [])))];
  const [pieceRows, stats, renders, anchorRows] = await Promise.all([
    repos.looks.piecesFor(userId, ids),
    repos.looks.wearStats(userId, ids),
    repos.assets.getManyForUser(userId, renderIds),
    Promise.all(anchorIds.map((id) => repos.wardrobe.get(userId, id))),
  ]);
  const [pieces, anchorPieces] = await Promise.all([
    toPieces(userId, pieceRows),
    toPieces(
      userId,
      anchorRows.filter((r): r is NonNullable<typeof r> => r !== undefined),
    ),
  ]);
  const anchors = new Map(anchorPieces.map((p) => [p.id, p]));
  const byLook = new Map<string, Look['pieces']>();
  pieceRows.forEach((row, i) => {
    const piece = pieces[i];
    if (!piece) return;
    const list = byLook.get(row.lookId) ?? [];
    list.push({ piece, slot: row.slot, role: LookRole.nullable().parse(row.role) });
    byLook.set(row.lookId, list);
  });
  const wears = new Map(stats.map((s) => [s.lookId, s]));
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  const images = new Map(
    await Promise.all(
      renders.map(async (a) => [a.id, await toImage(mediaDelivery, userId, a)] as const),
    ),
  );
  return rows.map((row) => {
    const proposals = proposalsOf(row.proposals);
    const anchor = row.anchorPieceId ? anchors.get(row.anchorPieceId) : undefined;
    // Robes' picture is the frame, else the render on her model; a picture whose renditions failed
    // gives way to the next. The record is the one she picked, else her photograph when she has
    // one (it leads, legacy "You" first), else Robes' picture.
    const usable = (id: string | null) => {
      const img = id ? images.get(id) : undefined;
      return img && img.status !== 'failed' ? img : null;
    };
    const model = usable(row.frameAssetId) ?? usable(row.renderAssetId);
    const photo = usable(row.photoAssetId);
    const record: 'photo' | 'model' =
      row.recordImage === 'model' || row.recordImage === 'photo'
        ? row.recordImage
        : photo
          ? 'photo'
          : 'model';
    const image = (record === 'photo' ? (photo ?? model) : (model ?? photo)) ?? null;
    const frameRender = row.renderKey?.startsWith('frame:') ?? false;
    // A frame is still coming while a job draws it (a claim younger than 10 minutes) or while its
    // renditions are made: in AWS they run later, from the S3 event, after the row says ready.
    const drawing =
      frameRender &&
      row.renderStatus === 'pending' &&
      row.renderClaimedAt !== null &&
      now - row.renderClaimedAt.getTime() < CLAIM_MS;
    const framePending =
      drawing || (row.frameAssetId ? images.get(row.frameAssetId)?.status === 'pending' : false);
    return Look.parse({
      id: row.id,
      status: LookStatus.parse(row.status),
      name: row.name,
      nameProvisional: row.nameProvisional,
      note: row.note,
      source: row.source,
      originLookId: row.originLookId,
      climateBand: row.climateBand,
      image,
      photo,
      model,
      record,
      frame: row.frameAssetId !== null,
      framePending,
      composedByRobes: ROBES_SOURCES.has(row.source) || proposals.length > 0,
      // A frame look never renders on her model (legacy 2026-10-07).
      onModel: frameRender ? null : (row.renderStatus ?? null),
      pieces: byLook.get(row.id) ?? [],
      proposals,
      styling: Styling.catch({}).parse(row.styling ?? {}),
      edits: Edits.catch({}).parse(row.edits ?? {}),
      anchor: anchor
        ? { id: anchor.id, label: anchor.label, brand: anchor.brand, image: anchor.image }
        : null,
      setId: row.setId,
      setIndex: row.setIndex,
      dateHint: row.dateHint,
      timesWorn: Number(wears.get(row.id)?.timesWorn ?? 0),
      lastWornOn: wears.get(row.id)?.lastWornOn ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  });
}

export async function toLook(userId: UserId, row: LookRow | undefined): Promise<Look> {
  if (!row) throw new ApiError('not_found');
  const [look] = await toLooks(userId, [row]);
  if (!look) throw new ApiError('not_found');
  return look;
}

// Someone else's piece is indistinguishable from a missing one.
export async function withOwnedPieces<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (err instanceof LookPiecesNotFound) throw new ApiError('not_found');
    throw err;
  }
}

export async function suggestedName(userId: UserId, firstPieceId: string | undefined) {
  const first = firstPieceId ? await repos.wardrobe.get(userId, firstPieceId) : undefined;
  return copy.suggestedName(first?.label ?? null);
}
