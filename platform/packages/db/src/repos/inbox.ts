import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';
import { usageRepo } from './usage';
import { wardrobeRepo } from './wardrobe';
import { wishlistRepo } from './wishlist';

// One held item (a link import or a receipt line). Stored as jsonb; the API parses it.
export interface InboxItem {
  label: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  // Product image as the shop published it; metadata only, never fetched or hotlinked.
  imageUrl?: string | null;
  sourceUrl?: string | null;
}

// Rows written by older code or a receipt parser may hold odd entries; only labelled ones file.
export function heldItems(value: unknown): InboxItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is InboxItem =>
      typeof v === 'object' && v !== null && typeof (v as InboxItem).label === 'string',
  );
}

const INBOX_COLUMNS = [
  'id',
  'source',
  'retailer',
  'subject',
  'items',
  'status',
  'filedIds',
  'filedTo',
  'receivedAt',
  'decidedAt',
] as const;

export type InboxAction = 'wardrobe' | 'wishlist' | 'dismiss';

// Wardrobe › Inbox: forwarded receipts waiting for a yes or no. A pasted link also holds a row
// (Review files it), but links never show in the Inbox or its counts: she chose where a link
// goes before pasting it, so only receipts ask her here (Add Piece redline 04b).
export function inboxRepo(db: Db) {
  const mine = (userId: UserId) => db.selectFrom('wardrobeInbox').where('userId', '=', userId);
  const waiting = (userId: UserId) =>
    mine(userId).where('status', '=', 'held').where('source', '=', 'receipt');

  return {
    listHeld(userId: UserId, limit = 50) {
      return waiting(userId)
        .select(INBOX_COLUMNS)
        .orderBy('receivedAt', 'desc')
        .limit(limit)
        .execute();
    },

    // Pieces (not receipts) waiting, so "N pieces waiting" counts what she will tick through.
    async piecesWaiting(userId: UserId): Promise<number> {
      const row = await waiting(userId)
        .select(
          sql<string>`coalesce(sum(case when jsonb_typeof(items) = 'array' then jsonb_array_length(items) else 0 end), 0)`.as(
            'n',
          ),
        )
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    get(userId: UserId, id: string) {
      return mine(userId).select(INBOX_COLUMNS).where('id', '=', id).executeTakeFirst();
    },

    // One held entry of any source (Review opens a pasted link by its id).
    getHeld(userId: UserId, id: string) {
      return mine(userId)
        .select(INBOX_COLUMNS)
        .where('id', '=', id)
        .where('status', '=', 'held')
        .executeTakeFirst();
    },

    // Files the chosen items (all when none are named) as pieces or wishes, or dismisses the row,
    // in one transaction. Deciding a row that is no longer held changes nothing (idempotent).
    async decide(userId: UserId, id: string, action: InboxAction, itemIndexes?: readonly number[]) {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom('wardrobeInbox')
          .select([...INBOX_COLUMNS])
          .where('userId', '=', userId)
          .where('id', '=', id)
          .forUpdate()
          .executeTakeFirst();
        if (!row) return undefined;
        if (row.status !== 'held') return row;
        if (action === 'dismiss') {
          return trx
            .updateTable('wardrobeInbox')
            .set({ status: 'dismissed', decidedAt: sql`now()` })
            .where('id', '=', id)
            .returning(INBOX_COLUMNS)
            .executeTakeFirstOrThrow();
        }
        const items = heldItems(row.items).filter(
          (_, i) => itemIndexes === undefined || itemIndexes.includes(i),
        );
        const filed: string[] = [];
        for (const item of items) {
          const label = item.label.slice(0, 120);
          if (action === 'wardrobe') {
            const piece = await wardrobeRepo(trx).create(userId, {
              label,
              brand: item.brand?.slice(0, 80) ?? null,
              price: item.price ?? null,
              currency: item.currency ?? null,
              acquiredVia: row.source === 'receipt' ? 'receipt' : 'url',
            });
            filed.push(piece.id);
          } else {
            const wish = await wishlistRepo(trx).create(userId, {
              label,
              brand: item.brand?.slice(0, 80) ?? null,
              price: item.price ?? null,
              currency: item.currency ?? null,
              sourceUrl: item.sourceUrl ?? null,
              sourceLabel: row.retailer?.slice(0, 120) ?? null,
            });
            filed.push(wish.id);
          }
        }
        return trx
          .updateTable('wardrobeInbox')
          .set({
            status: 'filed',
            filedTo: action,
            filedIds: filed,
            decidedAt: sql`now()`,
          })
          .where('id', '=', id)
          .returning(INBOX_COLUMNS)
          .executeTakeFirstOrThrow();
      });
    },
  };
}

// Worker side: a fetched link lands as one held row per import job (provider id dedupes retries),
// for Review alone; a forwarded receipt lands as one held row per message, for the Inbox.
export function inboxIntakeRepo(db: Db) {
  return {
    // Receipts: the owner of an active forwarding address, if any.
    async userForAddress(address: string): Promise<UserId | undefined> {
      const row = await db
        .selectFrom('inboxAddresses')
        .select('userId')
        .where('address', '=', address.toLowerCase())
        .where('revokedAt', 'is', null)
        .executeTakeFirst();
      return row?.userId as UserId | undefined;
    },

    async hasProvider(providerId: string): Promise<boolean> {
      const row = await db
        .selectFrom('wardrobeInbox')
        .select('id')
        .where('providerId', '=', providerId)
        .executeTakeFirst();
      return row !== undefined;
    },

    // One held row per inbound message (the SES message id dedupes redelivery). The
    // `inbox.receipt` quota is charged in the same transaction; QuotaExceeded propagates.
    async fromReceipt(
      userId: UserId,
      entry: {
        providerId: string;
        retailer: string;
        orderRef: string | null;
        subject: string | null;
        fromEmail: string | null;
        items: InboxItem[];
      },
    ): Promise<{ id: string; created: boolean }> {
      return db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('wardrobeInbox')
          .select('id')
          .where('providerId', '=', entry.providerId)
          .executeTakeFirst();
        if (existing) return { id: existing.id, created: false };
        await usageRepo(trx).consume(userId, 'inbox.receipt', 1, { executor: trx });
        const row = await trx
          .insertInto('wardrobeInbox')
          .values({
            userId,
            source: 'receipt',
            retailer: entry.retailer.slice(0, 120),
            orderRef: entry.orderRef?.slice(0, 80) ?? null,
            subject: entry.subject?.slice(0, 300) ?? null,
            fromEmail: entry.fromEmail?.slice(0, 300) ?? null,
            providerId: entry.providerId,
            items: JSON.stringify(entry.items),
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        return { id: row.id, created: true };
      });
    },

    async fromLink(
      userId: UserId,
      entry: { jobId: string; retailer: string | null; subject: string | null; item: InboxItem },
    ): Promise<string> {
      const providerId = `link:${entry.jobId}`;
      const inserted = await db
        .insertInto('wardrobeInbox')
        .values({
          userId,
          source: 'link',
          retailer: entry.retailer?.slice(0, 120) ?? null,
          subject: entry.subject?.slice(0, 200) ?? null,
          providerId,
          items: JSON.stringify([entry.item]),
        })
        .onConflict((oc) => oc.column('providerId').doNothing())
        .returning('id')
        .executeTakeFirst();
      if (inserted) return inserted.id;
      const existing = await db
        .selectFrom('wardrobeInbox')
        .select('id')
        .where('providerId', '=', providerId)
        .where('userId', '=', userId)
        .executeTakeFirstOrThrow();
      return existing.id;
    },
  };
}
