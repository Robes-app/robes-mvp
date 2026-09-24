import { z } from 'zod';

// Wardrobe › Inbox (M3 task 4): things Robes found for her, waiting for a yes or no.
// Product images stay out of the API: they're third-party URLs, never hotlinked (SEC-40).
export const InboxItem = z.object({
  index: z.number().int().min(0),
  label: z.string(),
  brand: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});

export const InboxEntry = z.object({
  id: z.uuid(),
  source: z.enum(['receipt', 'photo', 'link', 'share']),
  retailer: z.string().nullable(),
  subject: z.string().nullable(),
  items: z.array(InboxItem),
  receivedAt: z.iso.datetime(),
});
export type InboxEntry = z.infer<typeof InboxEntry>;

export const InboxList = z.object({ items: z.array(InboxEntry), count: z.number().int().min(0) });
export type InboxList = z.infer<typeof InboxList>;

export const InboxParams = z.object({ id: z.uuid() });

export const DecideInboxInput = z.object({
  action: z.enum(['wardrobe', 'wishlist', 'dismiss']),
  // Which items to file (all when omitted).
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
