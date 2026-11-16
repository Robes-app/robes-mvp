import type { ImageSource } from 'expo-image';

// A photo's source for expo-image, cached by its address without the signature. A delivered
// photo's URL is re-signed each day (media delivery: dayStableWindow), so keyed by the whole URL
// every photo downloaded again each morning (audit, native: images). Its path names the asset, the
// width and the format, and a changed photo is a new asset, so the path alone is a safe key. A
// local file (the camera's) has no query and keys by itself.
export function photoSource(uri: string): ImageSource {
  const q = uri.indexOf('?');
  return q > 0 && /^https?:/i.test(uri) ? { uri, cacheKey: uri.slice(0, q) } : { uri };
}
