// The in-app camera's pure parts (legacy bc56305 `__waCamShoot`), so the shot maths are testable
// without a video stream.
// A shot is scaled to this on its longest side before it leaves the page (legacy 1600).
export const CAPTURE_MAX = 1600;
export const CAPTURE_QUALITY = 0.9;
export const CAPTURE_TYPE = 'image/jpeg';
// The white flash over the viewfinder, in milliseconds.
export const FLASH_MS = 60;

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
