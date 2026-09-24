import { z } from 'zod';

// One-click unsubscribe (RFC 8058): the token names one person and one preference.
export const UnsubParams = z.object({ token: z.string().min(40).max(200) });
export const OneClickUnsubInput = z
  .object({ 'List-Unsubscribe': z.literal('One-Click') })
  .partial();
export const Ok = z.object({ ok: z.literal(true) });
