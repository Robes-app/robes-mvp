export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic' | 'avif';

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
const AVIF_BRANDS = new Set(['avif', 'avis']);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((b, i) => bytes[i] === b);
}

// ISO-BMFF `ftyp` box: the major brand, then compatible brands, decide HEIC vs AVIF.
function isoBrand(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 16 || ascii(bytes, 4, 8) !== 'ftyp') return null;
  const boxSize = Math.min(
    ((bytes[0] ?? 0) << 24) | ((bytes[1] ?? 0) << 16) | ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0),
    bytes.length,
    256,
  );
  const brands = [ascii(bytes, 8, 12)];
  for (let i = 16; i + 4 <= boxSize; i += 4) brands.push(ascii(bytes, i, i + 4));
  if (brands.some((b) => AVIF_BRANDS.has(b))) return 'avif';
  if (brands.some((b) => HEIC_BRANDS.has(b))) return 'heic';
  return null;
}

// Trusts the bytes, never the declared content type or file name.
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'webp';
  }
  return isoBrand(bytes);
}
