import { z } from 'zod';

const answer = z.boolean();

// null = not answered yet; the web banner asks until analytics has an answer.
export const Consents = z.object({
  analytics: answer.nullable(),
  replay: answer.nullable(),
  marketing_email: answer.nullable(),
  photo_analysis: answer.nullable(),
});
export type Consents = z.infer<typeof Consents>;

export const UpdateConsentsInput = z.object({
  // 'email' answers come from signed unsubscribe links, never from this route.
  source: z.enum(['web', 'ios', 'android']),
  consents: z
    .object({
      analytics: answer,
      replay: answer,
      marketing_email: answer,
      photo_analysis: answer,
    })
    .partial()
    .strict()
    .refine((c) => Object.keys(c).length > 0, 'answer at least one consent'),
});
export type UpdateConsentsInput = z.infer<typeof UpdateConsentsInput>;
