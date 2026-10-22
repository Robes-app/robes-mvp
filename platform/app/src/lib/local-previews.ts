// Her own photo, shown while the server makes its renditions, so a new piece never reads blank.
// shortcut: lives for this tab only; after a reload a pending piece shows its skeleton again.
const previews = new Map<string, string>();

export function rememberPreview(assetId: string, file: Blob): void {
  if (!previews.has(assetId)) previews.set(assetId, URL.createObjectURL(file));
}

export function localPreview(assetId: string | null | undefined): string | null {
  return (assetId && previews.get(assetId)) || null;
}
