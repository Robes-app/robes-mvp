// The photo she just picked or took, shown from the file on the phone until its renditions are
// made. Its own module so a tile can read it without the look editor's imports.
const local = new Map<string, string>();
export function rememberLocalPhoto(assetId: string, uri: string): void {
  local.set(assetId, uri);
}
export function localPhoto(assetId: string): string | null {
  return local.get(assetId) ?? null;
}
