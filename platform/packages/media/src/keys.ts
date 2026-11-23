import { CATALOG_KEY } from '@robes/core/avatar';
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
  // What her phone lifted out of the photograph (cutout brief): beside the original, and gone
  // with it when uploads/ expires. Only the cutouts made from it are kept.
  lift: (userId: string, assetId: string): string =>
    `uploads/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/lift`,
  // A request to cut one piece out of a photograph that is itself the piece's picture (the
  // single-photo read, which makes no crop): a copy of the photo's master, put here by the read
  // job once it knows the piece is not worn. The renderer answers it; it expires with uploads/.
  cutRequest: (userId: string, assetId: string): string =>
    `uploads/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/cut`,
  // The piece alone, on a see-through ground, beside its rectangle (the master and renditions).
  cutout: (userId: string, assetId: string): string =>
    `media/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/cutout.webp`,
  // The same cutout on white: what the drawing step is shown, which takes no transparency.
  cutoutReference: (userId: string, assetId: string): string =>
    `media/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/cutout.jpg`,
  generated: (userId: string, jobId: string, index: number): string =>
    `generated/${segment(userId, 'userId')}/${segment(jobId, 'jobId')}/${index}.png`,
  // Everything rendered from one asset: master, renditions, cutouts.
  assetMediaPrefix: (userId: string, assetId: string): string =>
    `media/${segment(userId, 'userId')}/${segment(assetId, 'assetId')}/`,
  // Path prefix covered by a user's signed cookie.
  userMediaPrefix: (userId: string): string => `media/${segment(userId, 'userId')}/`,
  // Shared model portraits (catalog/, public prefix): keyed by catalog picks, never by user.
  avatarCell: (cellKey: string, format: 'png' | 'jpg' | 'webp'): string => {
    if (!CATALOG_KEY.test(cellKey)) throw new Error('invalid cellKey');
    return `catalog/avatar/${cellKey}.${format}`;
  },
  // Every prefix holding her files; account deletion (SEC-80) empties all of them.
  userPrefixes: (userId: string): string[] =>
    ['uploads', 'media', 'generated', 'exports'].map(
      (root) => `${root}/${segment(userId, 'userId')}/`,
    ),
  // Her data export (SEC-81); the exports/ prefix expires after 7 days.
  dataExport: (userId: string, requestId: string): string =>
    `exports/${segment(userId, 'userId')}/${segment(requestId, 'requestId')}.json`,
};

const ORIGINAL = /^uploads\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/original$/;

const CUT = /^uploads\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/cut$/;

// A cut request's key (mediaKeys.cutRequest), from an S3 event.
export function parseCutKey(key: string): { userId: string; assetId: string } | null {
  const m = CUT.exec(key);
  if (!m?.[1] || !m[2] || !UUID.test(m[1]) || !UUID.test(m[2])) return null;
  return { userId: m[1], assetId: m[2] };
}

// Parses an `uploads/` key from an S3 event; anything else is not ours to process.
export function parseOriginalKey(key: string): { userId: string; assetId: string } | null {
  const m = ORIGINAL.exec(key);
  if (!m?.[1] || !m[2] || !UUID.test(m[1]) || !UUID.test(m[2])) return null;
  return { userId: m[1], assetId: m[2] };
}
