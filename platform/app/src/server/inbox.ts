import 'server-only';
import { ApiError } from '@robes/api';
import { InboxDecision, InboxEntry, type InboxList } from '@robes/contracts';
import { heldItems, type UserId } from '@robes/db';
import { repos } from './db';

type Row = NonNullable<Awaited<ReturnType<typeof repos.inbox.get>>>;

// Rows never leave as-is (CLAUDE.md rule 8); product image URLs are dropped (no hotlinking).
function toEntry(row: Row): InboxEntry {
  return InboxEntry.parse({
    id: row.id,
    source: row.source,
    retailer: row.retailer,
    subject: row.subject,
    items: heldItems(row.items).map((item, index) => ({
      index,
      label: item.label,
      brand: item.brand ?? null,
      price: item.price ?? null,
      currency: item.currency ?? null,
      sourceUrl: item.sourceUrl ?? null,
    })),
    receivedAt: row.receivedAt.toISOString(),
  });
}

// Receipts only, with the pieces they hold (a pasted link goes to Review, never the Inbox).
export async function loadInbox(userId: UserId): Promise<InboxList> {
  const [rows, count] = await Promise.all([
    repos.inbox.listHeld(userId),
    repos.inbox.piecesWaiting(userId),
  ]);
  return { items: rows.map(toEntry), count };
}

// One held entry of any source: Review opens a pasted link by the id its import returned.
export async function loadInboxEntry(userId: UserId, id: string): Promise<InboxEntry> {
  const row = await repos.inbox.getHeld(userId, id);
  if (!row) throw new ApiError('not_found');
  return toEntry(row);
}

export async function decideInbox(
  userId: UserId,
  id: string,
  action: 'wardrobe' | 'wishlist' | 'dismiss',
  itemIndexes?: number[],
): Promise<InboxDecision> {
  const row = await repos.inbox.decide(userId, id, action, itemIndexes);
  if (!row) throw new ApiError('not_found');
  return InboxDecision.parse({
    id: row.id,
    status: row.status,
    filedTo: row.filedTo,
    filedIds: row.filedIds,
  });
}
