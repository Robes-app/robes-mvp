import type { ApiClient } from '@robes/api-client';
import { queryKeys, useApiClient } from '@robes/api-client/react';
import { type BatchPiecesOutput, UploadContentType } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

export interface PickedPhoto {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export const MAX_BATCH = 30;

// Re-encoded to JPEG by the picker (quality < 1), so HEIC never reaches the renderer.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.85,
  exif: false,
};

function contentTypeOf(photo: PickedPhoto): UploadContentType {
  const parsed = UploadContentType.safeParse(photo.mimeType);
  return parsed.success ? parsed.data : 'image/jpeg';
}

// Photo → presigned PUT straight to storage (never through the API, SEC-20) → complete.
export async function uploadPhoto(api: ApiClient, photo: PickedPhoto): Promise<string> {
  const body = await (await fetch(photo.uri)).blob();
  const { assetId, upload } = await api.call('uploads.create', {
    input: {
      kind: 'wardrobe',
      contentType: contentTypeOf(photo),
      bytes: photo.fileSize || body.size,
    },
  });
  const put = await fetch(upload.url, { method: upload.method, headers: upload.headers, body });
  if (!put.ok) throw new Error(`upload failed: ${put.status}`);
  await api.call('uploads.complete', { params: { id: assetId } });
  return assetId;
}

export async function addPieces(api: ApiClient, photos: PickedPhoto[]): Promise<BatchPiecesOutput> {
  const assetIds: string[] = [];
  for (const photo of photos.slice(0, MAX_BATCH)) assetIds.push(await uploadPhoto(api, photo));
  return api.call('wardrobe.batch', { input: { assetIds } });
}

export type AddSource = 'camera' | 'library';
export type AddResult =
  | { status: 'added'; pieces: number }
  | { status: 'cancelled' }
  | { status: 'denied'; message: string }
  | { status: 'failed'; message: string };

async function pick(source: AddSource): Promise<PickedPhoto[] | 'denied' | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'denied';
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return result.canceled ? null : result.assets;
  }
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';
  const result = await ImagePicker.launchImageLibraryAsync({
    ...PICKER_OPTIONS,
    allowsMultipleSelection: true,
    selectionLimit: MAX_BATCH,
  });
  return result.canceled ? null : result.assets;
}

// Pick → upload → batch; the new pieces show as "reading" and fill in as analysis finishes.
export function useAddPieces(): { add: (source: AddSource) => Promise<AddResult>; busy: boolean } {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const add = useCallback(
    async (source: AddSource): Promise<AddResult> => {
      const photos = await pick(source);
      if (photos === 'denied') {
        return {
          status: 'denied',
          message: source === 'camera' ? copy.cameraDenied : copy.photosDenied,
        };
      }
      if (!photos || photos.length === 0) return { status: 'cancelled' };
      setBusy(true);
      try {
        const { pieces } = await addPieces(api, photos);
        await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
        return { status: 'added', pieces: pieces.length };
      } catch {
        return { status: 'failed', message: copy.addFailed };
      } finally {
        setBusy(false);
      }
    },
    [api, queryClient],
  );
  return { add, busy };
}
