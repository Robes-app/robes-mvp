import 'server-only';
import { ApiError } from '@robes/api';
import { type GenerateLookInput, Idea, IdeaWay, type StartJobOutput } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { toImage } from './asset-urls';
import { repos } from './db';
import { startJob } from './jobs';
import { mediaDelivery } from './media';

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
        status: z.enum(['ready', 'failed']),
      }),
    )
    .default([]),
});

// Text first, then three frames: one text call and three image calls, spent together.
const STYLE_QUOTA = [
  { metric: 'generation.text', cost: 1 },
  { metric: 'generation.image', cost: 3 },
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

export async function loadIdea(userId: UserId, id: string): Promise<Idea> {
  const row = await repos.ideas.get(userId, id);
  if (!row) throw new ApiError('not_found');
  const [idea] = await toIdeas(userId, [row]);
  if (!idea) throw new ApiError('not_found');
  return idea;
}
