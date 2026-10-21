import type { ApiClient } from '@robes/api-client';
import { type Asset, UploadContentType, type UploadKind } from '@robes/contracts';
import { rememberPreview } from './local-previews';

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

// Bytes go straight to storage on the presigned URL, never through the API (SEC-20).
export async function uploadPhoto(
  api: ApiClient,
  file: File,
  kind: UploadKind = 'wardrobe',
): Promise<Asset> {
  const contentType = UploadContentType.parse(file.type);
  const { assetId, upload } = await api.call('uploads.create', {
    input: { kind, contentType, bytes: file.size },
  });
  const put = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });
  if (!put.ok) throw new Error('put');
  rememberPreview(assetId, file);
  return api.call('uploads.complete', { params: { id: assetId } });
}
