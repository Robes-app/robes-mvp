import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { Camera } from '../src/features/wardrobe/Camera';
import {
  CAMERA_MODE_KEY,
  CAPTURE_MAX,
  captureSize,
  downscale,
  readMode,
} from '../src/features/wardrobe/camera-capture';
import { mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));
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
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
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
  'POST /wardrobe/items/batch': {
    pieces: [piece({ status: 'reading' })],
    jobs: [{ pieceId: PIECE_ID, jobId: ASSET_ID }],
  },
};

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
  expect(big).toEqual({ uri: 'file:///tmp/small.jpg', mimeType: 'image/jpeg' });

  mockResize.mockClear();
  const small = await downscale({ uri: 'file:///tmp/shot.jpg', width: 900, height: 1200 });
  expect(mockResize).not.toHaveBeenCalled();
  expect(small).toEqual({ uri: 'file:///tmp/shot.jpg', mimeType: 'image/jpeg' });
});

test('the mode is remembered per device, and anything else reads as Single', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('several');
  await expect(readMode()).resolves.toBe('several');
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('both');
  await expect(readMode()).resolves.toBe('single');
  (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('no store'));
  await expect(readMode()).resolves.toBe('single');

  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  mockFetch(UPLOAD);
  await show();
  await fireEvent.press(screen.getByRole('radio', { name: copy.several }));
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CAMERA_MODE_KEY, 'several');
});

test('Single files its one shot and lands on the read', async () => {
  const calls = mockFetch(UPLOAD);
  await show();
  await act(async () => {
    await fireEvent.press(shutter());
  });
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/piece/${PIECE_ID}?saw=1`));
  expect(calls.filter((c) => c.path.endsWith('/batch'))).toHaveLength(1);
  expect(calls.find((c) => c.path.endsWith('/batch'))?.body).toEqual({ assetIds: [ASSET_ID] });
});

test('Several collects, counts, and Done hands the lot to one batch', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('several');
  const calls = mockFetch(UPLOAD);
  await show();
  await waitFor(() => expect(screen.getByRole('radio', { name: copy.several })).toBeTruthy());
  // Done waits until something has been taken.
  const done = () => screen.getByRole('button', { name: copy.done });
  expect(done().props.accessibilityState.disabled).toBe(true);

  await act(async () => {
    await fireEvent.press(shutter());
  });
  await act(async () => {
    await fireEvent.press(shutter());
  });
  expect(screen.getByLabelText(copy.taken(2))).toBeTruthy();
  // Nothing is filed until Done.
  expect(calls.some((c) => c.path.endsWith('/batch'))).toBe(false);

  await act(async () => {
    await fireEvent.press(done());
  });
  await waitFor(() => expect(calls.filter((c) => c.path.endsWith('/batch'))).toHaveLength(1));
  expect(calls.find((c) => c.path.endsWith('/batch'))?.body).toEqual({
    assetIds: [ASSET_ID, ASSET_ID],
  });
});

test('closing with shots held asks first; with none it just leaves', async () => {
  const ask = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('several');
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
    assets: [{ uri: 'file:///tmp/small.jpg', mimeType: 'image/jpeg', fileSize: 2048 }],
  });
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.useDevice }));
  });
  expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/piece/${PIECE_ID}?saw=1`));
});
