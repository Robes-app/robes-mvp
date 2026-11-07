import type { ApiClient } from '@robes/api-client';
import type { UploadContentType, UploadKind } from '@robes/contracts';
import { File, UploadType } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

// The picker is asked to re-encode (quality < 1), but iOS can still hand back the original HEIC:
// uploadPhoto decides the format from the file itself.
export const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.85,
  exif: false,
};

// What the renderer opens, read from the file's first bytes; null for anything else (HEIC, AVIF).
async function renderableType(file: File): Promise<UploadContentType | null> {
  const handle = file.open();
  try {
    const b = await handle.readBytes(12);
    const text = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b[0] === 0x89 && text(1, 4) === 'PNG') return 'image/png';
    if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
    return null;
  } finally {
    handle.close();
  }
}

// The iOS picker can return the original HEIC labelled image/jpeg, which the renderer can't open:
// every library photo of that kind failed as heic_unsupported (7 Nov). The bytes decide; anything
// the renderer can't read is re-encoded to JPEG here, on the phone.
async function renderableFile(
  photo: PickedPhoto,
): Promise<{ file: File; contentType: UploadContentType }> {
  const file = new File(photo.uri);
  if (!file.size) {
    // Why it is empty says where to look: a missing file, or an address File can't read.
    const scheme = photo.uri.split(':')[0];
    throw new Error(`upload failed: empty photo (exists ${file.exists}, scheme ${scheme})`);
  }
  const contentType = await renderableType(file);
  if (contentType) return { file, contentType };
  const image = await ImageManipulator.manipulate(photo.uri).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return { file: new File(saved.uri), contentType: 'image/jpeg' };
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
  const { file, contentType } = await renderableFile(photo);
  const { assetId, upload } = await api.call('uploads.create', {
    input: { kind, contentType, bytes: file.size },
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
