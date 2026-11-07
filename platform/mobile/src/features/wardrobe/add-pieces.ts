import type { ApiClient } from '@robes/api-client';
import { UploadContentType, type UploadKind } from '@robes/contracts';
import { File, UploadType } from 'expo-file-system';
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
  // The presigned PUT signs the byte count, so it must be the file's own: the picker re-encodes
  // (PICKER_OPTIONS), and its `fileSize` can be the original's, which storage then refuses. Read
  // from the file and sent natively: fetch(file://).blob() reports 0 bytes in a release build, so
  // every TestFlight upload failed before it started (7 Nov).
  const file = new File(photo.uri);
  if (!file.size) throw new Error('upload failed: empty photo');
  const { assetId, upload } = await api.call('uploads.create', {
    input: { kind, contentType: contentTypeOf(photo), bytes: file.size },
  });
  const put = await file.upload(upload.url, {
    httpMethod: upload.method,
    headers: upload.headers,
    uploadType: UploadType.BINARY_CONTENT,
  });
  if (put.status < 200 || put.status >= 300) throw new Error(`upload failed: ${put.status}`);
  await api.call('uploads.complete', { params: { id: assetId } });
  return assetId;
}

// The ways a single photo is taken by a screen that picks its own (the first piece, a look photo).
export type AddSource = 'camera' | 'library';
