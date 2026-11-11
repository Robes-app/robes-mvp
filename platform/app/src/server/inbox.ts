import 'server-only';
import { ApiError } from '@robes/api';
import {
  InboxDecision,
  InboxEntry,
  type InboxItemState,
  type InboxList,
  type PieceImage,
} from '@robes/contracts';
import { heldItems, itemState, lineFields, type UserId } from '@robes/db';
import { toImage } from './asset-urls';
import { repos } from './db';
import { mediaDelivery } from './media';

type Row = NonNullable<Awaited<ReturnType<typeof repos.inbox.get>>>;
type Images = ReadonlyMap<string, PieceImage>;

// The lines' photos the fetcher stored as her own assets (SEC-40), signed like any piece's; one
// that is still rendering, failed or gone shows the hanger.
async function imagesOf(userId: UserId, rows: readonly Row[]): Promise<Images> {
  const ids = rows.flatMap((row) =>
    heldItems(row.items).flatMap((item) => (item.imageAssetId ? [item.imageAssetId] : [])),
  );
  const assets = await repos.assets.getManyForUser(userId, ids);
  return new Map(
    await Promise.all(
      assets
        .filter((a) => a.status === 'ready')
        .map(async (a) => [a.id, await toImage(mediaDelivery, userId, a)] as const),
    ),
  );
}

// Rows never leave as-is (CLAUDE.md rule 8); the shop's image URLs are dropped (no hotlinking).
// `state` keeps only the pieces in that state (the Receipts' tab); every piece otherwise.
function toEntry(row: Row, images: Images, state?: InboxItemState): InboxEntry {
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
        size: lineFields(item).size,
        image: item.imageAssetId ? (images.get(item.imageAssetId) ?? null) : null,
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
  const images = await imagesOf(userId, rows);
  return { items: rows.map((row) => toEntry(row, images, state)), count: counts.inbox, counts };
}

// One held entry of any source: Review opens a pasted link by the id its import returned.
export async function loadInboxEntry(userId: UserId, id: string): Promise<InboxEntry> {
  const row = await repos.inbox.getHeld(userId, id);
  if (!row) throw new ApiError('not_found');
  return toEntry(row, await imagesOf(userId, [row]));
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
