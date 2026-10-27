import { describe, expect, test } from 'vitest';
import { CAMERA_CONSTRAINTS, cameraAvailable, captureSize, shotName } from './camera-capture';

describe('captureSize', () => {
  test('scales the longest side down to 1600 and keeps the ratio', () => {
    expect(captureSize(1920, 1440)).toEqual({ width: 1600, height: 1200 });
    expect(captureSize(1440, 1920)).toEqual({ width: 1200, height: 1600 });
  });

  test('never upscales a small frame', () => {
    expect(captureSize(640, 480)).toEqual({ width: 640, height: 480 });
  });

  test('rounds so the canvas never takes a fractional size', () => {
    const { width, height } = captureSize(3001, 2000);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
    expect(width).toBe(1600);
  });

  test('a stream that reports no size is left alone', () => {
    expect(captureSize(0, 0)).toEqual({ width: 0, height: 0 });
  });
});

test('shotName names the file by when it was taken', () => {
  expect(shotName(1_700_000_000_000)).toBe('camera-1700000000000.jpg');
});

test('the stream asks for the rear camera and no audio', () => {
  expect(CAMERA_CONSTRAINTS.audio).toBe(false);
  expect(CAMERA_CONSTRAINTS.video).toMatchObject({ facingMode: { ideal: 'environment' } });
});

describe('cameraAvailable', () => {
  const withCamera = {
    navigator: { mediaDevices: { getUserMedia: () => Promise.resolve() } },
  } as unknown as Window;

  test('true when the API is there on a secure page', () => {
    expect(cameraAvailable({ ...withCamera, isSecureContext: true })).toBe(true);
  });

  test('false on an insecure page, so the door falls back to the OS camera', () => {
    expect(cameraAvailable({ ...withCamera, isSecureContext: false })).toBe(false);
  });

  test('false when the browser has no camera API at all', () => {
    expect(cameraAvailable({ navigator: {}, isSecureContext: true } as unknown as Window)).toBe(
      false,
    );
  });
});
