import { encode } from 'blurhash';
import sharp from 'sharp';
import type { ImageFormat } from './detect';
import { RENDITION_FORMATS, RENDITION_WIDTHS, type RenditionFormat } from './keys';

type Sharp = ReturnType<typeof sharp>;

export const IMAGE_LIMITS = {
  // Decompression-bomb guard: ~50 MP covers every phone camera.
  maxPixels: 50_000_000,
  minEdge: 32,
  masterEdge: 2048,
} as const;

export type RejectReason =
  | 'too_large'
  | 'unsupported_type'
  | 'heic_unsupported'
  | 'decode_failed'
  | 'too_small';

export class RejectedImage extends Error {
  constructor(readonly reason: RejectReason) {
    super(reason);
  }
}

export interface RenderedImage {
  master: { data: Buffer; width: number; height: number };
  renditions: Array<{ width: number; format: RenditionFormat; data: Buffer }>;
  blurhash: string;
}

const ENCODERS: Record<RenditionFormat, (img: Sharp) => Sharp> = {
  avif: (img) => img.avif({ quality: 50, effort: 4 }),
  webp: (img) => img.webp({ quality: 80 }),
};

function decode(input: Uint8Array): Sharp {
  return sharp(input, { limitInputPixels: IMAGE_LIMITS.maxPixels, failOn: 'error' });
}

// Output carries no metadata: sharp drops EXIF/GPS/XMP unless asked to keep it.
async function renderMaster(input: Uint8Array): Promise<RenderedImage['master']> {
  const { width, height } = await decode(input).metadata();
  if (Math.min(width, height) < IMAGE_LIMITS.minEdge) throw new RejectedImage('too_small');
  const { data, info } = await decode(input)
    .autoOrient()
    .resize({
      width: IMAGE_LIMITS.masterEdge,
      height: IMAGE_LIMITS.masterEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function blurhashOf(master: Buffer): Promise<string> {
  const { data, info } = await sharp(master)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
}

// Never upscales; an image narrower than the smallest width gets one rendition at its own width.
export function renditionWidths(masterWidth: number): number[] {
  const widths: number[] = RENDITION_WIDTHS.filter((w) => w <= masterWidth);
  return widths.length > 0 ? widths : [masterWidth];
}

export async function renderImage(input: Uint8Array, format: ImageFormat): Promise<RenderedImage> {
  try {
    const master = await renderMaster(input);
    const jobs = renditionWidths(master.width).flatMap((width) =>
      RENDITION_FORMATS.map(async (fmt) => ({
        width,
        format: fmt,
        data: await ENCODERS[fmt](sharp(master.data).resize({ width })).toBuffer(),
      })),
    );
    const [blurhash, renditions] = await Promise.all([blurhashOf(master.data), Promise.all(jobs)]);
    return { master, renditions, blurhash };
  } catch (err) {
    if (err instanceof RejectedImage) throw err;
    // Prebuilt libvips has no HEVC decoder; HEIC needs a custom build (README → Media).
    throw new RejectedImage(format === 'heic' ? 'heic_unsupported' : 'decode_failed');
  }
}
