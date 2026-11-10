import { shadeByName } from '@robes/core/colour';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';
import { usageRepo } from './usage';
import { wardrobeRepo } from './wardrobe';
import { wishlistRepo } from './wishlist';

// One held item (a link import or a receipt line). Stored as jsonb; the API parses it.
export type InboxItemState = 'inbox' | 'added' | 'discarded';

export interface InboxItem {
  label: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  // Product image as the shop published it; metadata only, never fetched or hotlinked.
  imageUrl?: string | null;
  sourceUrl?: string | null;
  // What the receipt printed for the piece. Rows carried over from beta keep beta's snake_case
  // keys, so read them through lineFields.
  size?: string | null;
  categoryL2?: string | null;
  categoryL3?: string | null;
  color?: string | null;
  // The line's product photo, fetched by the isolated fetcher (SEC-40) into her own private
  // asset; `photo` says how its read went ('reading' until the receipt_read job settles).
  imageAssetId?: string | null;
  photo?: 'reading' | 'read' | 'none';
  // Decided on its own (Front Door PRD rev 3 §7.5): added as a piece or wish (`filedId`), or
  // discarded. Unset is waiting in the Inbox.
  state?: InboxItemState;
  filedId?: string | null;
}

export const itemState = (item: InboxItem): InboxItemState => item.state ?? 'inbox';

// At most this many photos are read per receipt (legacy capped the vision pass at 24).
export const PHOTO_READS_PER_RECEIPT = 24;

// The line's photo address as the receipt printed it (beta's rows say image_url).
function photoUrlOf(item: InboxItem): string | null {
  const raw = item.imageUrl ?? (item as InboxItem & { image_url?: unknown }).image_url;
  return typeof raw === 'string' && /^https?:\/\//i.test(raw) ? raw.slice(0, 2048) : null;
}

const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

// The size, category and colour a receipt line holds, whichever app wrote it (the platform's
// camelCase or beta's snake_case), trimmed to what a piece stores.
export function lineFields(item: InboxItem): {
  size: string | null;
  categoryL2: string | null;
  categoryL3: string | null;
  color: string | null;
} {
  const raw = item as InboxItem & Record<string, unknown>;
  return {
    size: text(raw.size, 40),
    categoryL2: text(raw.categoryL2 ?? raw.category_l2, 80),
    categoryL3: text(raw.categoryL3 ?? raw.category_l3, 80),
    color: text(raw.color, 40),
  };
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
  'orderRef',
  'subject',
  'fromEmail',
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
  const receipts = (userId: UserId) => mine(userId).where('source', '=', 'receipt');
  // Receipts holding at least one piece in the state (a piece with no state is waiting).
  const withPieces = (userId: UserId, state: InboxItemState) =>
    receipts(userId).where(
      sql<boolean>`exists (select 1 from jsonb_array_elements(items) e where coalesce(e->>'state', 'inbox') = ${state})`,
    );

  return {
    // The Receipts' tabs (Front Door PRD rev 3 §7.5): the receipts with pieces waiting, added or
    // discarded, newest first; links never show here.
    list(userId: UserId, state: InboxItemState = 'inbox', limit = 50) {
      return withPieces(userId, state)
        .select(INBOX_COLUMNS)
        .orderBy('receivedAt', 'desc')
        .limit(limit)
        .execute();
    },

    listHeld(userId: UserId, limit = 50) {
      return this.list(userId, 'inbox', limit);
    },

    // Pieces per state across her receipts: the tabs' counts and the Inbox badge.
    async counts(userId: UserId): Promise<Record<InboxItemState, number>> {
      const rows = await receipts(userId)
        .innerJoin(sql`jsonb_array_elements(items)`.as('e'), (join) => join.onTrue())
        .select([
          sql<string>`coalesce(e.value->>'state', 'inbox')`.as('state'),
          sql<string>`count(*)`.as('n'),
        ])
        .groupBy(sql`coalesce(e.value->>'state', 'inbox')`)
        .execute();
      const out: Record<InboxItemState, number> = { inbox: 0, added: 0, discarded: 0 };
      for (const r of rows) {
        if (r.state === 'inbox' || r.state === 'added' || r.state === 'discarded') {
          out[r.state] = Number(r.n);
        }
      }
      return out;
    },

    // Pieces (not receipts) waiting, so "N pieces waiting" counts what she will tick through.
    async piecesWaiting(userId: UserId): Promise<number> {
      return (await this.counts(userId)).inbox;
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

    // Files the chosen pieces (every one still waiting when none are named) as pieces or wishes,
    // or discards them, in one transaction. Each piece is decided on its own (PRD rev 3 §7.5):
    // the others keep waiting, and the row is filed or dismissed once none does. A piece already
    // decided is left as it is, so deciding twice changes nothing (idempotent).
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
        const items = heldItems(row.items);
        const chosen = (i: number) =>
          itemState(items[i] as InboxItem) === 'inbox' &&
          (itemIndexes === undefined || itemIndexes.includes(i));
        const filed: string[] = [...row.filedIds];
        const next: InboxItem[] = [];
        for (const [i, item] of items.entries()) {
          if (!chosen(i)) {
            next.push(item);
            continue;
          }
          if (action === 'dismiss') {
            next.push({ ...item, state: 'discarded' });
            continue;
          }
          const label = item.label.slice(0, 120);
          // What the receipt printed travels onto the piece: its size, its category and colour.
          const { size, categoryL2, categoryL3, color } = lineFields(item);
          const read = {
            size,
            categoryL2,
            categoryL3,
            color,
            colourShade: shadeByName(color)?.id ?? null,
            // The line's photo, once fetched into her own asset, is the piece's photo too.
            imageAssetId: item.imageAssetId ?? null,
          };
          let filedId: string;
          if (action === 'wardrobe') {
            const piece = await wardrobeRepo(trx).create(userId, {
              label,
              ...read,
              brand: item.brand?.slice(0, 80) ?? null,
              price: item.price ?? null,
              currency: item.currency ?? null,
              acquiredVia: row.source === 'receipt' ? 'receipt' : 'url',
            });
            filedId = piece.id;
          } else {
            const wish = await wishlistRepo(trx).create(userId, {
              label,
              ...read,
              brand: item.brand?.slice(0, 80) ?? null,
              price: item.price ?? null,
              currency: item.currency ?? null,
              sourceUrl: item.sourceUrl ?? null,
              sourceLabel: row.retailer?.slice(0, 120) ?? null,
            });
            filedId = wish.id;
          }
          filed.push(filedId);
          next.push({ ...item, state: 'added', filedId });
        }
        // Only the odd malformed entries (no label) are dropped; everything she can see stays.
        const waiting = next.some((item) => itemState(item) === 'inbox');
        const added = next.some((item) => itemState(item) === 'added');
        const status = waiting ? 'held' : added ? 'filed' : 'dismissed';
        return trx
          .updateTable('wardrobeInbox')
          .set({
            items: JSON.stringify(next),
            status,
            ...(action !== 'dismiss' ? { filedTo: action } : {}),
            filedIds: filed,
            ...(waiting ? {} : { decidedAt: sql`now()` }),
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

    // A receipt's product photos (legacy inbox.js visionPass): one receipt_read job per waiting
    // line whose photo isn't read yet, each with the pending asset its photo will land in, so the
    // fetcher's bytes go through the rendition pipeline like any upload. Idempotent per line.
    async queuePhotoReads(
      userId: UserId,
      inboxId: string,
      limit = PHOTO_READS_PER_RECEIPT,
    ): Promise<{ jobId: string; url: string }[]> {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom('wardrobeInbox')
          .select(['items'])
          .where('userId', '=', userId)
          .where('id', '=', inboxId)
          .where('source', '=', 'receipt')
          .forUpdate()
          .executeTakeFirst();
        if (!row) return [];
        const items = heldItems(row.items);
        const queued: { jobId: string; url: string }[] = [];
        for (const [index, item] of items.entries()) {
          if (queued.length >= limit) break;
          const url = photoUrlOf(item);
          if (!url || item.imageAssetId || itemState(item) !== 'inbox') continue;
          // The row lock serialises re-reads, so a line read once is never queued twice.
          const idempotencyKey = `receipt-photo:${inboxId}:${index}`;
          const already = await trx
            .selectFrom('generationJobs')
            .select('id')
            .where('userId', '=', userId)
            .where('idempotencyKey', '=', idempotencyKey)
            .executeTakeFirst();
          if (already) continue;
          const asset = await trx
            .insertInto('assets')
            .values({ userId, kind: 'receipt', provider: 's3' })
            .returning('id')
            .executeTakeFirstOrThrow();
          const job = await trx
            .insertInto('generationJobs')
            .values({
              userId,
              kind: 'receipt_read',
              input: JSON.stringify({ inboxId, index, assetId: asset.id }),
              idempotencyKey,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          items[index] = { ...item, imageAssetId: asset.id, photo: 'reading' };
          queued.push({ jobId: job.id, url });
        }
        if (queued.length) {
          await trx
            .updateTable('wardrobeInbox')
            .set({ items: JSON.stringify(items) })
            .where('userId', '=', userId)
            .where('id', '=', inboxId)
            .execute();
        }
        return queued;
      });
    },

    // Held receipts with a waiting line whose photo was never asked for: rows read before photos
    // were (beta's carried-over rows among them), or whose request didn't go. The hourly
    // receipt-photos task queues them; a line asked for once carries `photo` and is left alone.
    async awaitingPhotos(limit = 20): Promise<{ userId: UserId; inboxId: string }[]> {
      const rows = await db
        .selectFrom('wardrobeInbox')
        .select(['userId', 'id'])
        .where('source', '=', 'receipt')
        .where('status', '=', 'held')
        .where(
          sql<boolean>`exists (
            select 1 from jsonb_array_elements(items) e
            where coalesce(e->>'imageUrl', e->>'image_url') ~* '^https?://'
              and e->>'imageAssetId' is null
              and e->>'photo' is null
              and coalesce(e->>'state', 'inbox') = 'inbox'
          )`,
        )
        .orderBy('receivedAt', 'desc')
        .limit(limit)
        .execute();
      return rows.map((r) => ({ userId: r.userId as UserId, inboxId: r.id }));
    },

    // One receipt line, for its photo read: what the email printed beside it and the shop.
    async line(userId: UserId, inboxId: string, index: number) {
      const row = await db
        .selectFrom('wardrobeInbox')
        .select(['retailer', 'items'])
        .where('userId', '=', userId)
        .where('id', '=', inboxId)
        .executeTakeFirst();
      const item = row ? heldItems(row.items)[index] : undefined;
      return row && item ? { retailer: row.retailer, item } : undefined;
    },

    // What a line's photo said (receipt_read): the photo decides what the piece is, the receipt
    // keeps its price, size and quantity (legacy visionPass merge). `null` is a photo that
    // couldn't be fetched or read: the line keeps what the receipt printed.
    async applyPhotoRead(
      userId: UserId,
      inboxId: string,
      index: number,
      read: {
        label: string;
        categoryL2: string | null;
        categoryL3: string | null;
        color: string | null;
      } | null,
    ): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom('wardrobeInbox')
          .select(['items'])
          .where('userId', '=', userId)
          .where('id', '=', inboxId)
          .forUpdate()
          .executeTakeFirst();
        const items = row ? heldItems(row.items) : [];
        const item = items[index];
        if (!item) return false;
        items[index] = read
          ? {
              ...item,
              label: read.label.slice(0, 120),
              categoryL2: read.categoryL2,
              categoryL3: read.categoryL3,
              color: read.color ?? lineFields(item).color,
              photo: 'read',
            }
          : // shortcut: the unused photo's asset (a shop's product shot, never her own photo)
            // stays in storage until her account is deleted; nothing reads or shows it.
            { ...item, imageAssetId: null, photo: 'none' };
        await trx
          .updateTable('wardrobeInbox')
          .set({ items: JSON.stringify(items) })
          .where('userId', '=', userId)
          .where('id', '=', inboxId)
          .execute();
        return true;
      });
    },
  };
}
