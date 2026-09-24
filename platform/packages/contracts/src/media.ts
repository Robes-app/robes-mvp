import { z } from 'zod';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const UPLOAD_KINDS = [
  'wardrobe',
  'wishlist',
  'headshot',
  'full_length',
  'look_photo',
] as const;
export const UploadKind = z.enum(UPLOAD_KINDS);
export type UploadKind = z.infer<typeof UploadKind>;

export const UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
] as const;
export const UploadContentType = z.enum(UPLOAD_CONTENT_TYPES);
export type UploadContentType = z.infer<typeof UploadContentType>;

export const CreateUploadInput = z.object({
  kind: UploadKind,
  contentType: UploadContentType,
  bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type CreateUploadInput = z.infer<typeof CreateUploadInput>;

// The client must send exactly these headers; the signature covers type and length.
export const PresignedUpload = z.object({
  method: z.literal('PUT'),
  url: z.url(),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.iso.datetime(),
});
export type PresignedUpload = z.infer<typeof PresignedUpload>;

export const CreateUploadOutput = z.object({ assetId: z.uuid(), upload: PresignedUpload });
export type CreateUploadOutput = z.infer<typeof CreateUploadOutput>;

export const AssetParams = z.object({ id: z.uuid() });

export const AssetRendition = z.object({ width: z.number().int(), avif: z.url(), webp: z.url() });
export type AssetRendition = z.infer<typeof AssetRendition>;

export const Asset = z.object({
  id: z.uuid(),
  kind: z.string(),
  status: z.enum(['pending', 'ready', 'failed']),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  blurhash: z.string().nullable(),
  // Signed for the caller; null until the asset is ready.
  master: z.url().nullable(),
  renditions: z.array(AssetRendition),
});
export type Asset = z.infer<typeof Asset>;

export const MediaSession = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('cookies'), expiresAt: z.iso.datetime() }),
  z.object({ mode: z.literal('local') }),
]);
export type MediaSession = z.infer<typeof MediaSession>;
