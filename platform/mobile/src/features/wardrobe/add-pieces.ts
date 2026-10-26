import type { ApiClient } from '@robes/api-client';
import { UploadContentType, type UploadKind } from '@robes/contracts';
import type * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

// Re-encoded to JPEG by the picker (quality < 1), so HEIC never reaches the renderer.
export const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.85,
  exif: false,
};

function contentTypeOf(photo: PickedPhoto): UploadContentType {
  const parsed = UploadContentType.safeParse(photo.mimeType);
  return parsed.success ? parsed.data : 'image/jpeg';
}

// Photo → presigned PUT straight to storage (never through the API, SEC-20) → complete.
export async function uploadPhoto(
  api: ApiClient,
  photo: PickedPhoto,
  kind: UploadKind = 'wardrobe',
): Promise<string> {
  const body = await (await fetch(photo.uri)).blob();
  const { assetId, upload } = await api.call('uploads.create', {
    input: {
      kind,
      contentType: contentTypeOf(photo),
      bytes: photo.fileSize || body.size,
    },
  });
  const put = await fetch(upload.url, { method: upload.method, headers: upload.headers, body });
  if (!put.ok) throw new Error(`upload failed: ${put.status}`);
  await api.call('uploads.complete', { params: { id: assetId } });
  return assetId;
}

// The ways a single photo is taken by a screen that picks its own (the first piece, a look photo).
export type AddSource = 'camera' | 'library';
