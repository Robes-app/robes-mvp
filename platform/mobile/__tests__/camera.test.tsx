import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { Camera } from '../src/features/wardrobe/Camera';
import { CAPTURE_MAX, captureSize, downscale } from '../src/features/wardrobe/camera-capture';
import { mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, JOB_ID } from './support/fixtures';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

const mockTakePicture = jest.fn(async () => ({
  uri: 'file:///tmp/shot.jpg',
  width: 3024,
  height: 4032,
  format: 'jpg' as const,
}));
let mockGranted = true;
let mockCanAsk = true;
jest.mock('expo-camera', () => {
  const { useEffect } = require('react');
  const request = jest.fn(async () => ({ granted: mockGranted }));
  return {
    useCameraPermissions: () => [{ granted: mockGranted, canAskAgain: mockCanAsk }, request],
    // The preview renders nothing here; it hands back the shutter's ref and reports itself ready.
    CameraView: ({
      ref,
      onCameraReady,
    }: {
      ref?: { current: unknown };
      onCameraReady?: () => void;
    }) => {
      useEffect(() => {
        if (ref) ref.current = { takePictureAsync: mockTakePicture };
        onCameraReady?.();
      });
      return null;
    },
  };
});

const mockResize = jest.fn();
const mockSave = jest.fn(async () => ({ uri: 'file:///tmp/small.jpg', width: 1200, height: 1600 }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => {
      const context = { resize: mockResize, renderAsync: async () => ({ saveAsync: mockSave }) };
      mockResize.mockReturnValue(context);
      return context;
    },
  },
}));

const copy = wardrobe.camera;

beforeEach(() => {
  mockGranted = true;
  mockCanAsk = true;
  jest.clearAllMocks();
  for (const k of Object.keys(mockParams)) delete mockParams[k];
  mockTakePicture.mockResolvedValue({
    uri: 'file:///tmp/shot.jpg',
    width: 3024,
    height: 4032,
    format: 'jpg',
  });
  mockSave.mockResolvedValue({ uri: 'file:///tmp/small.jpg', width: 1200, height: 1600 });
});

const UPLOAD = {
  'GET file:///tmp/small.jpg': {},
  'GET file:///tmp/shot.jpg': {},
  'POST /uploads': {
    assetId: ASSET_ID,
    upload: {
      method: 'PUT',
      url: 'http://minio.test/robes/uploads/x/original?sig=1',
      headers: { 'content-type': 'image/jpeg' },
      expiresAt: '2026-09-24T11:00:00.000Z',
    },
  },
  'PUT /robes/uploads/x/original': {},
  [`POST /uploads/${ASSET_ID}/complete`]: {
    id: ASSET_ID,
    kind: 'wardrobe',
    status: 'pending',
    width: null,
    height: null,
    blurhash: null,
    master: null,
    renditions: [],
  },
  'POST /wardrobe/photo-reads': { jobId: JOB_ID, status: 'queued' },
  [`GET /jobs/${JOB_ID}`]: {
    id: JOB_ID,
    kind: 'wardrobe_pieces',
    status: 'succeeded',
    stage: 'text',
    output: { assetId: ASSET_ID, noItemDetected: false, readPieces: [readPiece(0), readPiece(1)] },
    error: null,
    cancelRequested: false,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    finishedAt: '2026-10-15T10:00:01.000Z',
  },
};

function readPiece(index: number) {
  return {
    index,
    label: index ? 'Black leggings' : 'Cream tee',
    category: index ? 'Bottoms' : 'Tops',
    categoryL2: null,
    categoryL3: null,
    color: null,
    brand: null,
    notes: null,
    box: { x: 0, y: 0, w: 1, h: 1 },
    match: null,
    cropAssetId: ASSET_ID,
  };
}

const add = wardrobe.add;

const show = () => renderWithApi(<Camera />);

const shutter = () => screen.getByRole('button', { name: copy.shutter });

test('a shot is capped on its longest side, and a small frame is left alone', () => {
  expect(CAPTURE_MAX).toBe(1600);
  expect(captureSize(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  expect(captureSize(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  // Never upscaled, and never a fractional size.
  expect(captureSize(800, 1000)).toEqual({ width: 800, height: 1000 });
  expect(captureSize(1601, 1067)).toEqual({ width: 1600, height: 1066 });
  expect(captureSize(0, 0)).toEqual({ width: 0, height: 0 });
});

test('downscale resizes an oversized frame to JPEG and leaves one within the cap', async () => {
  const big = await downscale({ uri: 'file:///tmp/shot.jpg', width: 3024, height: 4032 });
  expect(mockResize).toHaveBeenCalledWith({ width: 1200, height: 1600 });
  expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.9 });
  expect(big).toEqual({
    uri: 'file:///tmp/small.jpg',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 1600,
  });

  mockResize.mockClear();
  const small = await downscale({ uri: 'file:///tmp/shot.jpg', width: 900, height: 1200 });
  expect(mockResize).not.toHaveBeenCalled();
  expect(small).toEqual({
    uri: 'file:///tmp/shot.jpg',
    mimeType: 'image/jpeg',
    width: 900,
    height: 1200,
  });
});

test('each shot is read as it is taken; the tray counts, and Review opens on them', async () => {
  const calls = mockFetch(UPLOAD);
  await show();
  const review = () => screen.getByRole('button', { name: add.shots.review });
  // Review waits until something has been taken and read.
  expect(review().props.accessibilityState.disabled).toBe(true);

  await act(async () => {
    await fireEvent.press(shutter());
  });
  await waitFor(() => expect(screen.getByText(add.shots.found(2))).toBeTruthy());
  expect(calls.filter((c) => c.path.endsWith('/photo-reads'))).toHaveLength(1);
  // Nothing files from the camera.
  expect(calls.some((c) => c.path.includes('/file') || c.path.endsWith('/batch'))).toBe(false);

  await fireEvent.press(review());
  const href = mockRouter.replace.mock.calls.at(-1)?.[0] as {
    pathname: string;
    params: { to: string; from: string; shots: string };
  };
  expect(href.pathname).toBe('/wardrobe/review');
  expect(href.params.to).toBe('wardrobe');
  expect(JSON.parse(href.params.shots)).toEqual([
    { uri: 'file:///tmp/small.jpg', width: 1200, height: 1600, jobId: JOB_ID },
  ]);
});

test('where the pieces go is chosen on the camera, Mine or Wishlist', async () => {
  mockParams.to = 'wishlist';
  mockFetch(UPLOAD);
  await show();
  expect(
    screen.getByRole('radio', { name: add.to.wishlist }).props.accessibilityState.checked,
  ).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: add.shots.mine }));
  expect(screen.getByRole('radio', { name: add.shots.mine }).props.accessibilityState.checked).toBe(
    true,
  );
  expect(screen.queryByRole('radio', { name: 'Several' })).toBeNull();
});

test('closing with shots held asks first; with none it just leaves', async () => {
  const ask = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockFetch(UPLOAD);
  await show();
  const close = () => screen.getByRole('button', { name: copy.close });

  await fireEvent.press(close());
  expect(ask).not.toHaveBeenCalled();
  expect(mockRouter.back).toHaveBeenCalled();

  mockRouter.back.mockClear();
  await act(async () => {
    await fireEvent.press(shutter());
  });
  await fireEvent.press(close());
  expect(ask).toHaveBeenCalledWith(copy.leave(1), copy.leaveBody, [
    { text: copy.stay, style: 'cancel' },
    { text: copy.leaveConfirm, style: 'destructive', onPress: expect.any(Function) },
  ]);
  expect(mockRouter.back).not.toHaveBeenCalled();
  // Leaving them is the destructive answer.
  ask.mock.calls.at(-1)?.[2]?.[1]?.onPress?.();
  expect(mockRouter.back).toHaveBeenCalled();
  ask.mockRestore();
});

test('a refused camera says so and hands over to the phone’s own', async () => {
  mockGranted = false;
  mockCanAsk = false;
  mockFetch(UPLOAD);
  await show();
  expect(screen.getByText(copy.unreachable)).toBeTruthy();
  (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///tmp/small.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048,
        width: 9,
        height: 12,
      },
    ],
  });
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.useDevice }));
  });
  expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
  // The phone's own photo goes to Review like any shot.
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/wardrobe/review' }),
    ),
  );
});
