import 'server-only';
import { ApiError } from '@robes/api';
import { type GenerateLookInput, Idea, IdeaWay, type StartJobOutput } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { toImage } from './asset-urls';
import { repos } from './db';
import { startJob } from './jobs';
import { mediaDelivery } from './media';
import { ensureGenericCells } from './model';
import { requestRender } from './renders';

type IdeaRow = NonNullable<Awaited<ReturnType<typeof repos.ideas.get>>>;

// What the key_piece job writes into artifacts.data (packages/jobs style-piece handler).
const IdeaData = z.object({
  anchor: Idea.shape.anchor,
  fallback: z.boolean(),
  wearer: Idea.shape.wearer,
  ways: z.array(IdeaWay),
  images: z
    .array(
      z.object({
        idx: z.number().int(),
        assetId: z.uuid().nullable(),
        status: z.enum(['ready', 'failed', 'pending', 'deferred']),
        jobId: z.uuid().nullable().optional(),
      }),
    )
    .default([]),
});

// Text first, then the hero frame: one text and one image call, spent together. The other two
// frames are charged only if she asks for them (requestRender).
const STYLE_QUOTA = [
  { metric: 'generation.text', cost: 1 },
  { metric: 'generation.image', cost: 1 },
] as const;
const STYLE_FAMILIES = ['gemini-flash-lite', 'gemini-image', 'gemini-image-lite'];

export async function generateLook(
  userId: UserId,
  req: Request,
  input: GenerateLookInput,
): Promise<StartJobOutput> {
  if (await repos.capacity.isExhausted(STYLE_FAMILIES)) throw new ApiError('capacity');
  if (input.anchor.type === 'piece' && !(await repos.wardrobe.get(userId, input.anchor.pieceId))) {
    throw new ApiError('not_found');
  }
  await ensureGenericCells(userId);
  return startJob(userId, req, { kind: 'key_piece', input, quota: [...STYLE_QUOTA] });
}

export async function toIdeas(userId: UserId, rows: IdeaRow[]): Promise<Idea[]> {
  const parsed = rows.map((row) => ({ row, data: IdeaData.parse(row.data) }));
  const assetIds = parsed.flatMap(({ data }) =>
    data.images.flatMap((f) => (f.assetId ? [f.assetId] : [])),
  );
  const assets = new Map(
    (await repos.assets.getManyForUser(userId, assetIds)).map((a) => [a.id, a]),
  );
  return Promise.all(
    parsed.map(async ({ row, data }) => {
      const frames = await Promise.all(
        data.images.map(async (f) => {
          const asset = f.assetId ? assets.get(f.assetId) : undefined;
          return {
            idx: f.idx,
            // The frame's asset renders asynchronously after the job; pending until it's ready.
            status: f.status === 'ready' && asset?.status !== 'ready' ? 'pending' : f.status,
            image: asset ? await toImage(mediaDelivery, userId, asset) : null,
          };
        }),
      );
      // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
      return Idea.parse({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        anchor: data.anchor,
        fallback: data.fallback,
        wearer: data.wearer,
        ways: data.ways,
        frames,
        jobId: row.generationJobId,
        savedAt: row.savedAt?.toISOString() ?? null,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      });
    }),
  );
}

// "Save this way as a look": a real Look from one of the idea's three ways, with its frame as the
// render and the anchor piece (if it's hers) as the first piece. Saving it keeps the idea too.
export async function saveWayAsLook(userId: UserId, ideaId: string, wayIdx: number) {
  const row = await repos.ideas.get(userId, ideaId);
  if (!row) throw new ApiError('not_found');
  const data = IdeaData.parse(row.data);
  const way = data.ways[wayIdx];
  if (!way) throw new ApiError('not_found');
  const frame = data.images.find((f) => f.idx === wayIdx && f.status === 'ready');
  const anchor =
    data.anchor.type === 'piece'
      ? await repos.wardrobe.get(userId, data.anchor.pieceId)
      : undefined;
  const look = await repos.looks.create(userId, {
    name: way.title,
    nameProvisional: true,
    note: [way.outfit, way.details, way.accessories].filter(Boolean).join('\n\n').slice(0, 2000),
    pieces: anchor ? [{ pieceId: anchor.id, role: 'anchor' }] : [],
    source: 'generated',
    renderAssetId: frame?.assetId ?? null,
  });
  await repos.ideas.save(userId, ideaId);
  return look;
}

export async function loadIdea(userId: UserId, id: string): Promise<Idea> {
  const row = await repos.ideas.get(userId, id);
  if (!row) throw new ApiError('not_found');
  const [idea] = await toIdeas(userId, [row]);
  if (!idea) throw new ApiError('not_found');
  return idea;
}

export async function requestIdeaFrame(
  userId: UserId,
  req: Request,
  ideaId: string,
  idx: number,
): Promise<StartJobOutput> {
  const row = await repos.ideas.get(userId, ideaId);
  if (!row) throw new ApiError('not_found');
  if (!IdeaData.parse(row.data).ways[idx]) throw new ApiError('not_found');
  return requestRender(userId, req, {
    type: 'idea',
    id: ideaId,
    idx,
    input: { target: 'idea', ideaId, idx },
  });
}
