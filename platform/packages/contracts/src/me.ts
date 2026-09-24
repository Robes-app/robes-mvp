import { z } from 'zod';

const name = z.string().trim().max(60);

// You › Notifications; missing keys read as the default so new kinds need no migration.
export const NotificationPrefs = z.object({
  looksReady: z.boolean().default(true),
  morningCue: z.boolean().default(true),
  nudges: z.boolean().default(false),
  receipts: z.boolean().default(true),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefs>;

export const Me = z.object({
  id: z.uuid(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  instagramHandle: z.string().nullable(),
  locale: z.string(),
  timezone: z.string(),
  currency: z.string(),
  homeCity: z.string().nullable(),
  onboarded: z.boolean(),
  notifications: NotificationPrefs,
});
export type Me = z.infer<typeof Me>;

export const UpdateMeInput = z
  .object({
    firstName: name.min(1),
    lastName: name,
    instagramHandle: z.string().regex(/^[A-Za-z0-9._]{1,30}$/),
    locale: z.string().max(20),
    timezone: z.string().max(64),
    currency: z.string().regex(/^[A-Z]{3}$/),
    homeCity: z.string().trim().max(120),
    notifications: z.object(NotificationPrefs.shape).partial().strict(),
  })
  .partial();
export type UpdateMeInput = z.infer<typeof UpdateMeInput>;

export const OnboardingComplete = z.object({ onboardedAt: z.iso.datetime() });

export const DeletionRequest = z.object({
  status: z.enum(['requested', 'running', 'completed', 'failed']),
  requestedAt: z.iso.datetime(),
});
export type DeletionRequest = z.infer<typeof DeletionRequest>;

export const DeletionStatus = z.object({ request: DeletionRequest.nullable() });
export type DeletionStatus = z.infer<typeof DeletionStatus>;

// Typed confirmation so a stray tap can't request deletion.
export const RequestDeletionInput = z.object({ confirm: z.literal('DELETE') });
