import { z } from 'zod';

const name = z.string().trim().max(60);

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
  })
  .partial();
export type UpdateMeInput = z.infer<typeof UpdateMeInput>;

export const OnboardingComplete = z.object({ onboardedAt: z.iso.datetime() });
