import { z } from 'zod';
import { AssetRendition } from './media';

// Public share links (M6 task 3): a whitelisted snapshot behind a 128-bit token (SEC-13).
export const ShareToken = z.string().regex(/^[A-Za-z0-9_-]{22,64}$/);
export const ShareParams = z.object({ token: ShareToken });

export const CreateShareInput = z.object({
  subjectType: z.literal('look'),
  subjectId: z.uuid(),
});

export const Share = z.object({ token: ShareToken, url: z.url(), createdAt: z.iso.datetime() });
export type Share = z.infer<typeof Share>;

const SharedImage = z.object({
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  blurhash: z.string().nullable(),
  // Signed for at most two hours.
  renditions: z.array(AssetRendition),
});

export const SharedLook = z.object({
  type: z.literal('look'),
  name: z.string(),
  note: z.string().nullable(),
  // Her first name, only if she has one set.
  by: z.string().nullable(),
  image: SharedImage.nullable(),
  pieces: z.array(
    z.object({ label: z.string(), category: z.string(), image: SharedImage.nullable() }),
  ),
  sharedAt: z.iso.datetime(),
});
export type SharedLook = z.infer<typeof SharedLook>;
