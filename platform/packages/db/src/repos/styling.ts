import { ageBandLabel, iconTag, investmentLabel } from '@robes/core/style-dna';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';
import { type MemoryEntry, styleMemoryRepo } from './style-dna';

const IDEA_TTL = sql<Date>`now() + interval '30 days'`;

// A memory row in the shape the prompt block reads (legacy style_dna.memory entries).
function legacyEntry(e: MemoryEntry): Record<string, unknown> {
  const t = e.at.toISOString();
  if (e.kind === 'wear') return { t, k: 'wear', look: e.subject, pieces: e.pieces };
  return {
    t,
    k: e.kind,
    v: e.verdict ?? undefined,
    on: e.subject ?? undefined,
    surface: e.surface ?? undefined,
    text: e.body ?? undefined,
    out: e.pieceOut ?? undefined,
    in: e.pieceIn ?? undefined,
    cat: e.category ?? undefined,
  };
}

// Worker-side access for styling jobs; everything is scoped by the job owner's id (SEC-16).
export function stylingRepo(db: Db) {
  return {
    async context(userId: UserId) {
      const profile = await db
        .selectFrom('profiles')
        .select([
          'firstName',
          'genderIdentity',
          'styleIcons',
          'styleArchetypes',
          'styleBrands',
          'investmentLevel',
          'heightCm',
          'sizeUk',
          sql<number | null>`shoe_uk::float8`.as('shoeUk'),
          'ageBand',
        ])
        .where('id', '=', userId)
        .executeTakeFirst();
      const closet = await db
        .selectFrom('wardrobeItems as w')
        .leftJoin('wardrobeItemStats as s', 's.wardrobeItemId', 'w.id')
        .select(['w.id', 'w.label', 'w.category', 'w.color', 'w.brand', 's.timesWorn'])
        .where('w.userId', '=', userId)
        .where('w.deletedAt', 'is', null)
        .where('w.status', '=', 'ready')
        .orderBy('w.heroPosition', 'asc')
        .orderBy('w.createdAt', 'desc')
        .limit(60)
        .execute();
      const dna = await db
        .selectFrom('styleProfiles')
        .select(['colorHarmony', 'silhouetteProportions', 'userOverrides', 'briefNotes'])
        .where('userId', '=', userId)
        .executeTakeFirst();
      const [kept, memory] = await Promise.all([
        db
          .selectFrom('styleBriefLines')
          .select(['list', 'text'])
          .where('userId', '=', userId)
          .where('state', '=', 'kept')
          .orderBy('createdAt', 'asc')
          .execute(),
        styleMemoryRepo(db).recent(userId, 60),
      ]);
      const listOf = (name: string) => kept.filter((l) => l.list === name).map((l) => l.text);
      const icons = profile?.styleIcons ?? [];
      const iconTags = Object.fromEntries(
        icons.map((i) => [i, iconTag(i)]).filter(([, t]) => t),
      ) as Record<string, string>;
      const count = await db
        .selectFrom('wardrobeItems')
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('userId', '=', userId)
        .where('deletedAt', 'is', null)
        .where('status', '=', 'ready')
        .executeTakeFirst();
      return {
        styleDna: {
          color_harmony: dna?.colorHarmony ?? null,
          silhouette_proportions: dna?.silhouetteProportions ?? null,
          user_overrides: dna?.userOverrides ?? {},
          // Her "very me" style types; the prompt block reads them as a register (legacy 2026-09-25).
          style_archetypes: profile?.styleArchetypes ?? [],
          // Her brief, the memory and Style DNA (legacy 2026-09-30 / 10-07), in the block's shape.
          brief: {
            loves: listOf('loves'),
            avoids: listOf('avoids'),
            rules: listOf('rules'),
            notes: dna?.briefNotes ?? '',
          },
          memory: { entries: memory.map(legacyEntry) },
          brands: profile?.styleBrands ?? [],
          investment: investmentLabel(profile?.investmentLevel),
          facts: {
            height_cm: profile?.heightCm ?? null,
            size_uk: profile?.sizeUk ?? null,
            shoe_uk: profile?.shoeUk ?? null,
            age_band: ageBandLabel(profile?.ageBand),
          },
          icon_tags: iconTags,
        },
        wardrobeCount: Number(count?.n ?? 0),
        firstName: profile?.firstName ?? null,
        gender: (profile?.genderIdentity ?? 'woman') as 'woman' | 'man' | 'unspecified',
        styleIcons: profile?.styleIcons ?? [],
        closet: closet.map((c) => ({
          id: c.id,
          label: c.label,
          category: c.category,
          color: c.color,
          brand: c.brand,
          timesWorn: c.timesWorn ?? 0,
        })),
      };
    },

    // The daily styler's view of her: closet by index with ids, heroes and season bands, plus
    // where she is (for the weather) and when (her timezone).
    async dailyContext(userId: UserId) {
      const base = await this.context(userId);
      const [profile, closet] = await Promise.all([
        db
          .selectFrom('profiles')
          .select(['homeCity', 'homeLat', 'homeLon', 'timezone'])
          .where('id', '=', userId)
          .executeTakeFirst(),
        db
          .selectFrom('wardrobeItems as w')
          .leftJoin('wardrobeItemStats as s', 's.wardrobeItemId', 'w.id')
          .select([
            'w.id',
            'w.label',
            'w.category',
            'w.color',
            'w.brand',
            'w.heroPosition',
            'w.seasonBand',
            's.timesWorn',
          ])
          .where('w.userId', '=', userId)
          .where('w.deletedAt', 'is', null)
          .where('w.status', '=', 'ready')
          .orderBy('w.heroPosition', 'asc')
          .orderBy('w.createdAt', 'desc')
          .limit(60)
          .execute(),
      ]);
      return {
        firstName: base.firstName,
        gender: base.gender,
        styleIcons: base.styleIcons,
        styleDna: base.styleDna,
        homeCity: profile?.homeCity ?? null,
        homeLat: profile?.homeLat == null ? null : Number(profile.homeLat),
        homeLon: profile?.homeLon == null ? null : Number(profile.homeLon),
        timezone: profile?.timezone ?? 'Europe/Dublin',
        closet: closet.map((c) => ({
          id: c.id,
          label: c.label,
          category: c.category,
          color: c.color,
          brand: c.brand,
          timesWorn: c.timesWorn ?? 0,
          hero: c.heroPosition !== null,
          seasonBand: c.seasonBand,
        })),
      };
    },

    // A daily look is a draft: kept 30 days unless she names it (legacy "nothing saved until named").
    async createDailyLook(
      userId: UserId,
      look: { jobId: string; title: string; subtitle: string; data: Record<string, unknown> },
    ): Promise<string> {
      const row = await db
        .insertInto('artifacts')
        .values({
          userId,
          type: 'daily_look',
          title: look.title.slice(0, 160),
          subtitle: look.subtitle.slice(0, 240),
          data: JSON.stringify(look.data),
          generationJobId: look.jobId,
          expiresAt: IDEA_TTL,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
    },

    // A trip is hers from the start: saved, never expiring (unlike ideas and daily drafts).
    async createTrip(
      userId: UserId,
      trip: { jobId: string; title: string; subtitle: string; data: Record<string, unknown> },
    ): Promise<string> {
      const row = await db
        .insertInto('artifacts')
        .values({
          userId,
          type: 'travel_edit',
          title: trip.title.slice(0, 160),
          subtitle: trip.subtitle.slice(0, 240),
          data: JSON.stringify(trip.data),
          generationJobId: trip.jobId,
          savedAt: sql`now()`,
          expiresAt: null,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
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
