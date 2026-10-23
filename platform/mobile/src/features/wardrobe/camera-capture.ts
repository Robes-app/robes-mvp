import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import type { PickedPhoto } from './add-pieces';

// The in-app camera's logic (legacy bc56305 `__waCamShoot`), apart from the viewfinder so the
// shot maths and the remembered mode are testable without a camera. Twin of the web's
// `app/src/components/wardrobe/camera-capture.ts`; keep the two in step.
export const CAMERA_MODES = ['single', 'several'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

// A UI preference, not a token: SecureStore is the only per-device store the app carries
// (CLAUDE.md rule 10), and `push.ts` already keeps a plain flag there.
export const CAMERA_MODE_KEY = 'robes.cameraMode';
// A shot is scaled to this on its longest side before it is uploaded (legacy 1600).
export const CAPTURE_MAX = 1600;
export const CAPTURE_QUALITY = 0.9;
export const CAPTURE_TYPE = 'image/jpeg';

export function isCameraMode(value: unknown): value is CameraMode {
  return CAMERA_MODES.includes(value as CameraMode);
}

// Never upscale a small frame; round so the resize never takes a fractional size.
export function captureSize(
  width: number,
  height: number,
  max = CAPTURE_MAX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > 0 ? Math.min(1, max / longest) : 1;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function readMode(): Promise<CameraMode> {
  try {
    const stored = await SecureStore.getItemAsync(CAMERA_MODE_KEY);
    if (isCameraMode(stored)) return stored;
  } catch {
    // No store on this platform: Single, as it would be on a first run.
  }
  return 'single';
}

export function rememberMode(mode: CameraMode): void {
  SecureStore.setItemAsync(CAMERA_MODE_KEY, mode).catch(() => {
    // The pick still holds for this run.
  });
}

export interface Shot {
  width: number;
  height: number;
  uri: string;
}

// The camera hands back a full-sensor frame; the upload wants the long side at 1600, as JPEG.
// A frame already within the cap is left alone — nothing to gain from a second encode.
export async function downscale(shot: Shot): Promise<PickedPhoto> {
  const size = captureSize(shot.width, shot.height);
  if (size.width === shot.width && size.height === shot.height)
    return { uri: shot.uri, mimeType: CAPTURE_TYPE };
  const image = await ImageManipulator.manipulate(shot.uri).resize(size).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: CAPTURE_QUALITY });
  return { uri: saved.uri, mimeType: CAPTURE_TYPE };
}
