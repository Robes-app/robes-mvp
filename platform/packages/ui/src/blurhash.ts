import { decode, isBlurhashValid } from 'blurhash';

const SIZE = 32;
const cache = new Map<string, string | null>();

// Decodes to a tiny canvas; null when the hash is invalid or there's no canvas (SSR, jsdom).
export function blurhashToDataUrl(hash: string): string | null {
  const hit = cache.get(hash);
  if (hit !== undefined) return hit;
  let url: string | null = null;
  if (typeof document !== 'undefined' && isBlurhashValid(hash).result) {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const image = ctx.createImageData(SIZE, SIZE);
      image.data.set(decode(hash, SIZE, SIZE));
      ctx.putImageData(image, 0, 0);
      url = canvas.toDataURL();
    }
  }
  cache.set(hash, url);
  return url;
}
