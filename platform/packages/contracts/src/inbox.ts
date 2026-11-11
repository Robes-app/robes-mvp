import { z } from 'zod';
import { PieceImage } from './wardrobe';

// Wardrobe › Inbox (M3 task 4): things Robes found for her, waiting for a yes or no.
// A shop's photo URL never leaves the API (SEC-40: never hotlinked). A line's photo reaches her
// only once the isolated fetcher has stored it as her own asset, signed like any piece's.
// Where a receipt's piece stands (Front Door PRD rev 3 §7.5): waiting in the Inbox, added to her
// wardrobe, or discarded. Each piece is decided on its own; the row stays held until all are.
export const InboxItemState = z.enum(['inbox', 'added', 'discarded']);
export type InboxItemState = z.infer<typeof InboxItemState>;

export const InboxItem = z.object({
  index: z.number().int().min(0),
  label: z.string(),
  brand: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  // The size the receipt printed ("6/7 years (122 cm)"), shown on the row and filed with the piece.
  size: z.string().nullable().default(null),
  // The line's photo once it is read and rendered; null shows the hanger.
  image: PieceImage.nullable().default(null),
  sourceUrl: z.string().nullable(),
  state: InboxItemState.default('inbox'),
  // The piece or wish it became, once added.
  filedId: z.uuid().nullable().default(null),
});

export const InboxEntry = z.object({
  id: z.uuid(),
  source: z.enum(['receipt', 'photo', 'link', 'share']),
  retailer: z.string().nullable(),
  subject: z.string().nullable(),
  // The order's own reference and the sender, for the group's footer (§7.5).
  orderRef: z.string().nullable().default(null),
  fromEmail: z.string().nullable().default(null),
  items: z.array(InboxItem),
  receivedAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().nullable().default(null),
});
export type InboxEntry = z.infer<typeof InboxEntry>;

// The Receipts' tabs: INBOX · ADDED · DISCARDED, each listing the receipts with pieces in that
// state (and only those pieces). `inbox` is the default and what the notice and badge count.
export const InboxListInput = z.object({ state: InboxItemState.default('inbox') });
export type InboxListInput = z.infer<typeof InboxListInput>;

export const InboxCounts = z.object({
  inbox: z.number().int().min(0),
  added: z.number().int().min(0),
  discarded: z.number().int().min(0),
});
export type InboxCounts = z.infer<typeof InboxCounts>;

export const InboxList = z.object({
  items: z.array(InboxEntry),
  // The pieces waiting in the Inbox, whatever tab was asked for (the notice and the badge).
  count: z.number().int().min(0),
  counts: InboxCounts.default({ inbox: 0, added: 0, discarded: 0 }),
});
export type InboxList = z.infer<typeof InboxList>;

export const InboxParams = z.object({ id: z.uuid() });

export const DecideInboxInput = z.object({
  action: z.enum(['wardrobe', 'wishlist', 'dismiss']),
  // Which items to file or discard (every piece still waiting when omitted). A receipt's other
  // pieces keep waiting; the row is decided once none does.
  itemIndexes: z.array(z.number().int().min(0).max(50)).max(50).optional(),
});

export const InboxDecision = z.object({
  id: z.uuid(),
  status: z.enum(['held', 'filed', 'dismissed']),
  filedTo: z.enum(['wardrobe', 'wishlist']).nullable(),
  filedIds: z.array(z.uuid()),
});
export type InboxDecision = z.infer<typeof InboxDecision>;

// Paste a link (M3 task 9). The fetcher's guard (SEC-40) enforces https and public addresses;
// the contract only rejects non-web schemes early.
export const ImportLinkInput = z.object({
  url: z.url({ protocol: /^https?$/ }).max(2048),
  as: z.enum(['wardrobe', 'wishlist']).default('wardrobe'),
});
export type ImportLinkInput = z.infer<typeof ImportLinkInput>;

// Forwarded receipts (M3 task 10): her private forwarding address. Anyone who has it can put a
// receipt in her Inbox for review, so she can regenerate or turn it off.
export const InboxAddress = z.object({
  address: z.email(),
  createdAt: z.iso.datetime(),
});
export type InboxAddress = z.infer<typeof InboxAddress>;
export const InboxAddressStatus = z.object({ address: InboxAddress.nullable() });
