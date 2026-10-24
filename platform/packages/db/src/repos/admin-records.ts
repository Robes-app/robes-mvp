import { sql } from 'kysely';
import type { Db } from '../client';

// One person's records for the admin user page: what she filed, made, kept, said and was sent,
// and the model calls behind it. Bounded lists (newest first); prompts and responses stay out of
// these lists and are read one call at a time (`generationCall`).
const LIMITS = {
  pieces: 60,
  wishlist: 40,
  looks: 60,
  artifacts: 40,
  feedback: 40,
  memory: 40,
  brief: 60,
  notifications: 40,
  inbox: 20,
  calls: 60,
  events: 60,
} as const;

// Her photo for a row, as { id, status, renditions } (the app signs it).
const asset = (db: Db, column: 'wardrobe_items' | 'wishlist_items') =>
  db
    .selectFrom('assets')
    .select(
      sql<unknown>`json_build_object('id', assets.id, 'status', assets.status, 'renditions', assets.renditions)`.as(
        'a',
      ),
    )
    .where(sql<boolean>`assets.id = ${sql.raw(column)}.image_asset_id`)
    .where('assets.deletedAt', 'is', null);

export async function collectRecords(db: Db, userId: string) {
  const [
    pieceCount,
    pieces,
    wishlist,
    looks,
    artifacts,
    feedback,
    memory,
    brief,
    notifications,
    inbox,
    calls,
    events,
  ] = await Promise.all([
    db
      .selectFrom('wardrobeItems')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('userId', '=', userId)
      .where('deletedAt', 'is', null)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom('wardrobeItems')
      .select((eb) => [
        'wardrobeItems.id',
        'wardrobeItems.label',
        'wardrobeItems.category',
        'wardrobeItems.brand',
        'wardrobeItems.colourShade',
        'wardrobeItems.status',
        'wardrobeItems.acquiredVia',
        'wardrobeItems.heroPosition',
        'wardrobeItems.createdAt',
        asset(db, 'wardrobe_items').as('image'),
        eb
          .selectFrom('wears')
          .select((s) => s.fn.countAll<string>().as('n'))
          .whereRef('wears.userId', '=', 'wardrobeItems.userId')
          .where(sql<boolean>`wardrobe_items.id = any(wears.piece_ids)`)
          .as('wears'),
      ])
      .where('wardrobeItems.userId', '=', userId)
      .where('wardrobeItems.deletedAt', 'is', null)
      .orderBy('wardrobeItems.createdAt', 'desc')
      .limit(LIMITS.pieces)
      .execute(),
    db
      .selectFrom('wishlistItems')
      .select([
        'wishlistItems.id',
        'wishlistItems.label',
        'wishlistItems.brand',
        'wishlistItems.sourceType',
        'wishlistItems.price',
        'wishlistItems.currency',
        'wishlistItems.promotedItemId',
        'wishlistItems.createdAt',
        asset(db, 'wishlist_items').as('image'),
      ])
      .where('wishlistItems.userId', '=', userId)
      .where('wishlistItems.deletedAt', 'is', null)
      .orderBy('wishlistItems.createdAt', 'desc')
      .limit(LIMITS.wishlist)
      .execute(),
    db
      .selectFrom('looks')
      .select((eb) => [
        'looks.id',
        'looks.name',
        'looks.status',
        'looks.source',
        'looks.createdAt',
        eb
          .selectFrom('lookPieces')
          .select((s) => s.fn.countAll<string>().as('n'))
          .whereRef('lookPieces.lookId', '=', 'looks.id')
          .whereRef('lookPieces.userId', '=', 'looks.userId')
          .as('pieces'),
        sql<number>`case when jsonb_typeof(looks.proposals) = 'array' then jsonb_array_length(looks.proposals) else 0 end`.as(
          'proposals',
        ),
        eb
          .selectFrom('wears')
          .select((s) => s.fn.countAll<string>().as('n'))
          .whereRef('wears.lookId', '=', 'looks.id')
          .whereRef('wears.userId', '=', 'looks.userId')
          .as('wears'),
        eb
          .selectFrom('wears')
          .select(sql<string | null>`max(worn_on)::text`.as('d'))
          .whereRef('wears.lookId', '=', 'looks.id')
          .whereRef('wears.userId', '=', 'looks.userId')
          .as('lastWornOn'),
        eb
          .selectFrom('assets')
          .select(
            sql<unknown>`json_build_object('id', assets.id, 'status', assets.status, 'renditions', assets.renditions)`.as(
              'a',
            ),
          )
          .where(
            sql<boolean>`assets.id = coalesce(looks.render_asset_id, looks.photo_asset_id, looks.frame_asset_id)`,
          )
          .where('assets.deletedAt', 'is', null)
          .as('image'),
      ])
      .where('looks.userId', '=', userId)
      .where('looks.deletedAt', 'is', null)
      .orderBy('looks.createdAt', 'desc')
      .limit(LIMITS.looks)
      .execute(),
    db
      .selectFrom('artifacts')
      .select(['id', 'type', 'title', 'subtitle', 'createdAt', 'savedAt', 'generationJobId'])
      .where('userId', '=', userId)
      .where('deletedAt', 'is', null)
      .orderBy('createdAt', 'desc')
      .limit(LIMITS.artifacts)
      .execute(),
    db
      .selectFrom('feedback')
      .select(['id', 'rating', 'note', 'track', 'subjectType', 'subjectId', 'createdAt'])
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .limit(LIMITS.feedback)
      .execute(),
    db
      .selectFrom('styleMemory')
      .select([
        'id',
        'kind',
        'surface',
        'subject',
        'body',
        'verdict',
        'category',
        'pieceOut',
        'pieceIn',
        'createdAt',
      ])
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .limit(LIMITS.memory)
      .execute(),
    db
      .selectFrom('styleBriefLines')
      .select(['id', 'list', 'state', 'source', 'text', 'because', 'createdAt'])
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .limit(LIMITS.brief)
      .execute(),
    db
      .selectFrom('notifications')
      .select(['id', 'kind', 'channel', 'status', 'ref', 'sentAt'])
      .where('userId', '=', userId)
      .orderBy('sentAt', 'desc')
      .limit(LIMITS.notifications)
      .execute(),
    db
      .selectFrom('wardrobeInbox')
      .select([
        'id',
        'retailer',
        'status',
        'source',
        'orderRef',
        'filedTo',
        'receivedAt',
        'decidedAt',
        sql<number>`case when jsonb_typeof(items) = 'array' then jsonb_array_length(items) else 0 end`.as(
          'items',
        ),
        sql<number>`cardinality(filed_ids)`.as('filed'),
      ])
      .where('userId', '=', userId)
      .orderBy('receivedAt', 'desc')
      .limit(LIMITS.inbox)
      .execute(),
    db
      .selectFrom('generationCalls')
      .select([
        'id',
        'feature',
        'model',
        'status',
        'latencyMs',
        'costMicros',
        'images',
        'tokensIn',
        'tokensOut',
        'jobId',
        'createdAt',
        sql<boolean>`prompt is not null`.as('hasPrompt'),
      ])
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .limit(LIMITS.calls)
      .execute(),
    db
      .selectFrom('events')
      .select(['id', 'eventType', 'createdAt'])
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .limit(LIMITS.events)
      .execute(),
  ]);
  return {
    pieceCount: Number(pieceCount.n),
    pieces,
    wishlist,
    looks,
    artifacts,
    feedback,
    memory,
    brief,
    notifications,
    inbox,
    calls,
    events,
  };
}
