import { z } from 'zod';

// One-click unsubscribe (RFC 8058): the token names one person and one preference.
export const UnsubParams = z.object({ token: z.string().min(40).max(200) });
export const OneClickUnsubInput = z
  .object({ 'List-Unsubscribe': z.literal('One-Click') })
  .partial();
export const Ok = z.object({ ok: z.literal(true) });

// Public waitlist signup (SEC-60): the response never says whether the address was new.
export const JoinWaitlistInput = z.object({
  email: z.email().max(254),
  name: z.string().trim().max(120).optional(),
  source: z.string().trim().max(60).optional(),
  utm: z
    .record(z.string().regex(/^utm_[a-z]{1,20}$/), z.string().max(120))
    .refine((u) => Object.keys(u).length <= 5)
    .optional(),
  turnstileToken: z.string().max(2048).optional(),
});
export type JoinWaitlistInput = z.infer<typeof JoinWaitlistInput>;
