// Bucket key layout: infrastructure.md §5. Every private key starts with a user id so delivery
// can be scoped to `/media/{userId}/*`.

export const RENDITION_WIDTHS = [320, 640, 1080, 1600] as const;
export const RENDITION_FORMATS = ['avif', 'webp'] as const;
export type RenditionFormat = (typeof RENDITION_FORMATS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function segment(id: string, what: string): string {
  if (!UUID.test(id)) throw new Error(`invalid ${what}`);
  return id;
}

export const mediaKeys = {
  original: (userId: string, assetId: string): string =>
    `uploads/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/original`,
  master: (userId: string, assetId: string): string =>
    `media/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/master.jpg`,
  rendition: (userId: string, assetId: string, width: number, format: RenditionFormat): string => {
    if (!Number.isInteger(width) || width <= 0) throw new Error('invalid width');
    return `media/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/${width}.${format}`;
  },
  cutout: (userId: string, assetId: string, format: 'png' | 'webp'): string =>
    `media/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/cutout.${format}`,
  generated: (userId: string, jobId: string, index: number): string =>
    `generated/${segment(userId, 'userId')}/${segment(jobId, 'jobId')}/${index}.png`,
  // Path prefix covered by a user's signed cookie.
  userMediaPrefix: (userId: string): string => `media/${segment(userId, 'userId')}/`,
  // Every prefix holding her files; account deletion (SEC-80) empties all of them.
  userPrefixes: (userId: string): string[] =>
    ['uploads', 'media', 'generated'].map((root) => `${root}/${segment(userId, 'userId')}/`),
};

const ORIGINAL = /^uploads\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/original$/;

// Parses an `uploads/` key from an S3 event; anything else is not ours to process.
export function parseOriginalKey(key: string): { userId: string; assetId: string } | null {
  const m = ORIGINAL.exec(key);
  if (!m?.[1] || !m[2] || !UUID.test(m[1]) || !UUID.test(m[2])) return null;
  return { userId: m[1], assetId: m[2] };
}
