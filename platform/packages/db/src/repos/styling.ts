import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

const IDEA_TTL = sql<Date>`now() + interval '30 days'`;

// Worker-side access for styling jobs; everything is scoped by the job owner's id (SEC-16).
export function stylingRepo(db: Db) {
  return {
    async context(userId: UserId) {
      const profile = await db
        .selectFrom('profiles')
        .select(['firstName', 'genderIdentity', 'styleIcons'])
        .where('id', '=', userId)
        .executeTakeFirst();
      const closet = await db
        .selectFrom('wardrobeItems as w')
        .leftJoin('wardrobeItemStats as s', 's.wardrobeItemId', 'w.id')
        .select(['w.label', 'w.category', 'w.color', 's.timesWorn'])
        .where('w.userId', '=', userId)
        .where('w.deletedAt', 'is', null)
        .where('w.status', '=', 'ready')
        .orderBy('w.heroPosition', 'asc')
        .orderBy('w.createdAt', 'desc')
        .limit(60)
        .execute();
      return {
        firstName: profile?.firstName ?? null,
        gender: (profile?.genderIdentity ?? 'woman') as 'woman' | 'man' | 'unspecified',
        styleIcons: profile?.styleIcons ?? [],
        closet: closet.map((c) => ({
          label: c.label,
          category: c.category,
          color: c.color,
          timesWorn: c.timesWorn ?? 0,
        })),
      };
    },

    anchorPiece(userId: UserId, pieceId: string) {
      return db
        .selectFrom('wardrobeItems')
        .select(['id', 'label', 'imageAssetId'])
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
    },

    async createGeneratedAsset(userId: UserId): Promise<string> {
      const row = await db
        .insertInto('assets')
        .values({ userId, kind: 'generated', contentType: 'image/png', provider: 's3' })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
    },

    async trackImage(frame: {
      jobId: string;
      userId: UserId;
      idx: number;
      role: 'hero' | 'still';
      assetId: string | null;
      status: 'pending' | 'ready' | 'failed';
    }): Promise<void> {
      await db
        .insertInto('generationAssets')
        .values(frame)
        .onConflict((oc) =>
          oc
            .columns(['jobId', 'idx'])
            .doUpdateSet({ assetId: frame.assetId, status: frame.status }),
        )
        .execute();
    },

    // Robes' unsaved output: expires in 30 days unless she saves it (roadmap M4 task 4).
    async createIdea(
      userId: UserId,
      idea: { jobId: string; title: string; subtitle: string; data: Record<string, unknown> },
    ): Promise<string> {
      const row = await db
        .insertInto('artifacts')
        .values({
          userId,
          type: 'idea',
          title: idea.title.slice(0, 160),
          subtitle: idea.subtitle.slice(0, 240),
          data: JSON.stringify(idea.data),
          generationJobId: idea.jobId,
          expiresAt: IDEA_TTL,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
    },

    async mergeIdeaData(
      userId: UserId,
      ideaId: string,
      patch: Record<string, unknown>,
    ): Promise<void> {
      await db
        .updateTable('artifacts')
        .set({ data: sql`data || ${JSON.stringify(patch)}::jsonb` })
        .where('userId', '=', userId)
        .where('id', '=', ideaId)
        .execute();
    },
  };
}
