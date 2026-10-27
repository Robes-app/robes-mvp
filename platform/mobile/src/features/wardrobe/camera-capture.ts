import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { PickedPhoto } from './add-pieces';

// The in-app camera's logic (legacy bc56305 `__waCamShoot`), apart from the viewfinder so the
// shot maths are testable without a camera. Twin of the web's
// `app/src/components/wardrobe/camera-capture.ts`; keep the two in step.

// A shot is scaled to this on its longest side before it is uploaded (legacy 1600).
export const CAPTURE_MAX = 1600;
export const CAPTURE_QUALITY = 0.9;
export const CAPTURE_TYPE = 'image/jpeg';

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

export interface Shot {
  width: number;
  height: number;
  uri: string;
}

// The camera hands back a full-sensor frame; the upload wants the long side at 1600, as JPEG.
// A frame already within the cap is left alone — nothing to gain from a second encode. The
// size rides along: Review crops each piece out of the local frame.
export async function downscale(
  shot: Shot,
): Promise<PickedPhoto & { width: number; height: number }> {
  const size = captureSize(shot.width, shot.height);
  if (size.width === shot.width && size.height === shot.height)
    return { uri: shot.uri, mimeType: CAPTURE_TYPE, ...size };
  const image = await ImageManipulator.manipulate(shot.uri).resize(size).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: CAPTURE_QUALITY });
  return { uri: saved.uri, mimeType: CAPTURE_TYPE, ...size };
}
