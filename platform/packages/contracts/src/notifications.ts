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
export const Notifications = z.object({ items: z.array(NotificationItem) });
export type Notifications = z.infer<typeof Notifications>;

export const DismissNotificationInput = z.object({ key: z.string().trim().min(1).max(80) });
