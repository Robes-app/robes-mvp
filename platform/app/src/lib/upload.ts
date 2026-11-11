import type { ApiClient } from '@robes/api-client';
import { type Asset, UploadContentType, type UploadKind } from '@robes/contracts';
import { CAPTURE_QUALITY, CAPTURE_TYPE, captureSize } from '@/components/wardrobe/camera-capture';
import { rememberPreview } from './local-previews';

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

// The server keeps a photo at most this long on its longest side (the renderer's master,
// @robes/media IMAGE_LIMITS.masterEdge); anything larger is uploaded only to be thrown away.
// Native twin: UPLOAD_MAX in mobile/src/features/wardrobe/add-pieces.ts.
export const UPLOAD_MAX = 2048;

// The size to shrink to, aspect kept; null when the photo already fits.
export function uploadSize(
  width: number,
  height: number,
): { width: number; height: number } | null {
  if (Math.max(width, height) <= UPLOAD_MAX) return null;
  return captureSize(width, height, UPLOAD_MAX);
}

// A photo larger than the server keeps is shrunk here, as JPEG; one the browser can't decode goes
// as it is, and the renderer decides.
async function fitForUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const size = uploadSize(bitmap.width, bitmap.height);
    const canvas = size ? document.createElement('canvas') : null;
    const context = canvas?.getContext('2d');
    if (!size || !canvas || !context) return file;
    canvas.width = size.width;
    canvas.height = size.height;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, CAPTURE_TYPE, CAPTURE_QUALITY),
    );
    return blob
      ? new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.jpg`, { type: CAPTURE_TYPE })
      : file;
  } finally {
    bitmap.close();
  }
}

// Bytes go straight to storage on the presigned URL, never through the API (SEC-20).
export async function uploadPhoto(
  api: ApiClient,
  picked: File,
  kind: UploadKind = 'wardrobe',
): Promise<Asset> {
  const file = await fitForUpload(picked);
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
