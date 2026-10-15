import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

const REQUEST_COLUMNS = [
  'id',
  'status',
  'requestedAt',
  'updatedAt',
  'assetKey',
  'expiresAt',
] as const;

// Her data exports (SEC-81); the maintenance worker builds them (dataExportRepo below).
export function exportsRepo(db: Db) {
  const latest = (userId: UserId) =>
    db
      .selectFrom('dataExportRequests')
      .select(REQUEST_COLUMNS)
      .where('userId', '=', userId)
      .orderBy('requestedAt', 'desc')
      .limit(1)
      .executeTakeFirst();

  return {
    latest,

    // Idempotent for a day: a live request from the last 24 h is returned instead of a new one.
    async request(userId: UserId) {
      return db.transaction().execute(async (trx) => {
        // Serialises concurrent requests for the same person.
        await trx.selectFrom('users').select('id').where('id', '=', userId).forUpdate().execute();
        const recent = await trx
          .selectFrom('dataExportRequests')
          .select(REQUEST_COLUMNS)
          .where('userId', '=', userId)
          .where('status', 'in', ['requested', 'running', 'ready'])
          .where('requestedAt', '>', sql<Date>`now() - interval '24 hours'`)
          .orderBy('requestedAt', 'desc')
          .limit(1)
          .executeTakeFirst();
        if (recent) return { ...recent, created: false };
        const row = await trx
          .insertInto('dataExportRequests')
          .values({ userId })
          .returning(REQUEST_COLUMNS)
          .executeTakeFirstOrThrow();
        return { ...row, created: true };
      });
    },
  };
}

// Worker side (SEC-81): claims one request at a time; a crashed run is retried after 15 minutes.
export function dataExportRepo(db: Db) {
  return {
    async claimNext({ retryAfterMinutes = 15 } = {}) {
      const row = await db
        .updateTable('dataExportRequests')
        .set({ status: 'running', updatedAt: sql`now()` })
        .where(
          'id',
          '=',
          db
            .selectFrom('dataExportRequests')
            .select('id')
            .where((eb) =>
              eb.or([
                eb('status', '=', 'requested'),
                eb.and([
                  eb('status', 'in', ['running', 'failed']),
                  eb(
                    'updatedAt',
                    '<',
                    sql<Date>`now() - make_interval(mins => ${retryAfterMinutes})`,
                  ),
                ]),
              ]),
            )
            .orderBy('requestedAt')
            .limit(1)
            .forUpdate()
            .skipLocked(),
        )
        .returning(['id', 'userId'])
        .executeTakeFirst();
      return row ? { id: row.id, userId: row.userId as UserId } : undefined;
    },

    async fail(id: string): Promise<void> {
      await db
        .updateTable('dataExportRequests')
        .set({ status: 'failed' })
        .where('id', '=', id)
        .execute();
    },

    async complete(id: string, assetKey: string): Promise<void> {
      await db
        .updateTable('dataExportRequests')
        .set({ status: 'ready', assetKey, expiresAt: sql`now() + interval '7 days'` })
        .where('id', '=', id)
        .execute();
    },

    // Everything she owns, scoped by her id only. Session tokens, accounts (OAuth tokens) and
    // verification rows are deliberately left out.
    async collect(userId: UserId) {
      const [
        user,
        profile,
        styleProfile,
        consents,
        pieces,
        wishlist,
        looks,
        lookPieces,
        wears,
        plan,
        ideas,
        shares,
        assets,
        styleBriefLines,
        styleMemory,
      ] = await Promise.all([
        db
          .selectFrom('users')
          .select(['id', 'email', 'name', 'emailVerified', 'createdAt'])
          .where('id', '=', userId)
          .executeTakeFirst(),
        db.selectFrom('profiles').selectAll().where('id', '=', userId).executeTakeFirst(),
        db
          .selectFrom('styleProfiles')
          .select([
            'season',
            'undertone',
            'contrast',
            'bodyType',
            'colourRender',
            'silhouetteRender',
            'userOverrides',
            'briefNotes',
            'briefReadAt',
            'updatedAt',
          ])
          .where('userId', '=', userId)
          .executeTakeFirst(),
        db
          .selectFrom('consents')
          .select(['kind', 'granted', 'source', 'createdAt'])
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('wardrobeItems')
          .selectAll()
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('wishlistItems')
          .selectAll()
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('looks')
          .selectAll()
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('lookPieces')
          .select(['lookId', 'wardrobeItemId', 'slot', 'role', 'position'])
          .where('userId', '=', userId)
          .execute(),
        db
          .selectFrom('wears')
          .select([
            'id',
            'lookId',
            'pieceIds',
            'note',
            'source',
            'confirmedAt',
            sql<string>`worn_on::text`.as('wornOn'),
          ])
          .where('userId', '=', userId)
          .orderBy('wornOn')
          .execute(),
        db
          .selectFrom('plannedDays')
          .select([
            'id',
            'lookId',
            'slot',
            'status',
            'activity',
            'headline',
            'createdAt',
            'deletedAt',
            sql<string>`day_date::text`.as('dayDate'),
          ])
          .where('userId', '=', userId)
          .orderBy('dayDate')
          .execute(),
        db
          .selectFrom('artifacts')
          .select([
            'id',
            'type',
            'title',
            'subtitle',
            'data',
            'savedAt',
            'expiresAt',
            'createdAt',
            'deletedAt',
          ])
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('shares')
          .select(['token', 'subjectType', 'subjectId', 'viewCount', 'createdAt', 'revokedAt'])
          .where('ownerId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('assets')
          .select([
            'id',
            'kind',
            'status',
            'contentType',
            'bytes',
            'width',
            'height',
            'createdAt',
            'deletedAt',
          ])
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('styleBriefLines')
          .select([
            'list',
            'state',
            'text',
            'fullText',
            'because',
            'source',
            'origin',
            'chip',
            'loved',
            'rejected',
            'keptAt',
            'createdAt',
          ])
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
        db
          .selectFrom('styleMemory')
          .select([
            'kind',
            'surface',
            'subject',
            'body',
            'verdict',
            'pieceOut',
            'pieceIn',
            'category',
            'lookId',
            'createdAt',
          ])
          .where('userId', '=', userId)
          .orderBy('createdAt')
          .execute(),
      ]);
      return {
        user,
        profile,
        styleProfile,
        consents,
        pieces,
        wishlist,
        looks,
        lookPieces,
        wears,
        plan,
        ideas,
        shares,
        assets,
        styleBriefLines,
        styleMemory,
      };
    },
  };
}
