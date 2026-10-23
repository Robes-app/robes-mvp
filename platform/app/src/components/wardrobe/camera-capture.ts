// The in-app camera's pure parts (legacy bc56305 `__waCamShoot`), so the shot maths and the
// remembered mode are testable without a video stream.
export const CAMERA_MODES = ['single', 'several'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export const CAMERA_MODE_KEY = 'robes.camera.mode';
// A shot is scaled to this on its longest side before it leaves the page (legacy 1600).
export const CAPTURE_MAX = 1600;
export const CAPTURE_QUALITY = 0.9;
export const CAPTURE_TYPE = 'image/jpeg';
// The white flash over the viewfinder, in milliseconds.
export const FLASH_MS = 60;

export function isCameraMode(value: unknown): value is CameraMode {
  return CAMERA_MODES.includes(value as CameraMode);
}

// Never upscale a small frame; round so the canvas never takes a fractional size.
export function captureSize(
  width: number,
  height: number,
  max = CAPTURE_MAX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > 0 ? Math.min(1, max / longest) : 1;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function shotName(at: number): string {
  return `camera-${at}.jpg`;
}

// The stream the legacy door asked for: the rear camera, big enough to crop from.
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
  audio: false,
};

// No camera API, or an insecure page: the OS capture input answers in the same tap.
export function cameraAvailable(win: Pick<Window, 'navigator' | 'isSecureContext'>): boolean {
  if (win.isSecureContext === false) return false;
  return typeof win.navigator?.mediaDevices?.getUserMedia === 'function';
}
