import { z } from 'zod';

// The bell (Front Door design 3k, plan 2026-11-02): what waits for her, computed on each read —
// receipts to review in the Wardrobe inbox, days of the last week with no wear logged, and the
// look Robes made her overnight (plan D2: it opens the daily look; nothing reaches the day until
// she saves it). Each item carries its own key so a dismissal sticks; the clients route by
// `kind`, `date` and `lookId`.
export const NotificationKind = z.enum(['receipts', 'diary', 'overnight']);
export type NotificationKind = z.infer<typeof NotificationKind>;

export const NotificationItem = z.object({
  key: z.string().min(1).max(80),
  kind: NotificationKind,
  text: z.string(),
  line: z.string().nullable(),
  // The day a diary nudge is about.
  date: z.iso.date().nullable(),
  // The daily look an overnight item opens.
  lookId: z.uuid().nullable().default(null),
});
export type NotificationItem = z.infer<typeof NotificationItem>;

// The sheet as it is drawn now (design "Onboarding notifications", 19 Nov): the Twin, Style DNA and
// Observations cards first, then the items above. Its own list, because phone apps already out
// parse `items` against the three kinds and would lose the whole bell to a new one. `seen` says
// whether it stood when she last opened the sheet (the dot lights for the rest); `section` names
// the Style DNA answer the card opens on.
export const BellCardKind = z.enum(['twin', 'dna', 'observations', ...NotificationKind.options]);
export type BellCardKind = z.infer<typeof BellCardKind>;
export const BellCard = NotificationItem.extend({
  kind: BellCardKind,
  seen: z.boolean(),
  section: z.enum(['gender', 'age', 'investment', 'types', 'brands']).nullable().default(null),
});
export type BellCard = z.infer<typeof BellCard>;

export const Notifications = z.object({
  items: z.array(NotificationItem),
  cards: z.array(BellCard).default([]),
});
export type Notifications = z.infer<typeof Notifications>;

// One item by its key, or `all`: the ✓ of phone apps already out clears everything it shows (PRD
// rev 3 §10 12) bar the Twin and Style DNA cards. The sheet has no ✓ now (design 19 Nov).
export const DismissNotificationInput = z.union([
  z.object({ key: z.string().trim().min(1).max(80) }),
  z.object({ all: z.literal(true) }),
]);
export type DismissNotificationInput = z.infer<typeof DismissNotificationInput>;
