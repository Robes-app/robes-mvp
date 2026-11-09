import 'server-only';
import { ApiError } from '@robes/api';
import { InboxDecision, InboxEntry, type InboxItemState, type InboxList } from '@robes/contracts';
import { heldItems, itemState, type UserId } from '@robes/db';
import { repos } from './db';

type Row = NonNullable<Awaited<ReturnType<typeof repos.inbox.get>>>;

// Rows never leave as-is (CLAUDE.md rule 8); product image URLs are dropped (no hotlinking).
// `state` keeps only the pieces in that state (the Receipts' tab); every piece otherwise.
function toEntry(row: Row, state?: InboxItemState): InboxEntry {
  return InboxEntry.parse({
    id: row.id,
    source: row.source,
    retailer: row.retailer,
    subject: row.subject,
    orderRef: row.orderRef,
    fromEmail: row.fromEmail,
    items: heldItems(row.items)
      .map((item, index) => ({
        index,
        label: item.label,
        brand: item.brand ?? null,
        price: item.price ?? null,
        currency: item.currency ?? null,
        sourceUrl: item.sourceUrl ?? null,
        state: itemState(item),
        filedId: item.filedId ?? null,
      }))
      .filter((item) => state === undefined || item.state === state),
    receivedAt: row.receivedAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  });
}

// Receipts only, with the pieces they hold in the asked state (a pasted link goes to Review,
// never the Inbox); `count` is the pieces waiting, whichever tab is open.
export async function loadInbox(
  userId: UserId,
  state: InboxItemState = 'inbox',
): Promise<InboxList> {
  const [rows, counts] = await Promise.all([
    repos.inbox.list(userId, state),
    repos.inbox.counts(userId),
  ]);
  return { items: rows.map((row) => toEntry(row, state)), count: counts.inbox, counts };
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
