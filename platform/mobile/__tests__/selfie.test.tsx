import { twin, wardrobe, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { SelfieCamera } from '../src/features/you/SelfieCamera';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, JOB_ID } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

const mockTakePicture = jest.fn(async () => ({
  uri: 'file:///tmp/selfie.jpg',
  width: 1200,
  height: 1600,
  format: 'jpg' as const,
}));
let mockGranted = true;
let mockCanAsk = true;
let mockFacing: string | undefined;
jest.mock('expo-camera', () => {
  const { useEffect } = require('react');
  const request = jest.fn(async () => ({ granted: mockGranted }));
  return {
    useCameraPermissions: () => [{ granted: mockGranted, canAskAgain: mockCanAsk }, request],
    // The preview renders nothing here; it hands back the shutter's ref and reports itself ready.
    CameraView: ({
      ref,
      facing,
      onCameraReady,
    }: {
      ref?: { current: unknown };
      facing?: string;
      onCameraReady?: () => void;
    }) => {
      mockFacing = facing;
      useEffect(() => {
        if (ref) ref.current = { takePictureAsync: mockTakePicture };
        onCameraReady?.();
      });
      return null;
    },
  };
});

const copy = twin.twinPage.selfie;
const PICKED = { uri: 'file:///tmp/library.jpg', mimeType: 'image/jpeg', width: 900, height: 1200 };
const UPLOAD = {
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
    kind: 'headshot',
    status: 'pending',
    width: null,
    height: null,
    blurhash: null,
    master: null,
    renditions: [],
  },
  'POST /me/style/analyse': { jobId: JOB_ID, status: 'queued' },
};

beforeEach(() => {
  mockGranted = true;
  mockCanAsk = true;
  jest.clearAllMocks();
});

test('the front camera under the face guide; a shot goes to review, Retake comes back', async () => {
  mockFetch(UPLOAD);
  await renderWithApi(<SelfieCamera />);
  expect(screen.getByText(copy.hint)).toBeTruthy();
  expect(mockFacing).toBe('front');
  await fireEvent.press(screen.getByRole('button', { name: copy.flip }));
  expect(mockFacing).toBe('back');
  await fireEvent.press(screen.getByRole('button', { name: copy.shutter }));
  expect(await screen.findByTestId('selfie-review')).toBeTruthy();
  expect(screen.getByText(copy.reviewNote)).toBeTruthy();
  // Retake from the camera is the camera again; nothing was sent.
  await fireEvent.press(screen.getByRole('button', { name: copy.retake }));
  expect(await screen.findByText(copy.hint)).toBeTruthy();
  expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
});

test('Use photo reads it as her close-up and opens Your digital twin on the read', async () => {
  const calls = mockFetch(UPLOAD);
  await renderWithApi(<SelfieCamera />);
  await fireEvent.press(screen.getByRole('button', { name: copy.shutter }));
  await fireEvent.press(await screen.findByRole('button', { name: copy.use }));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/you/model',
      params: { read: JOB_ID },
    }),
  );
  expect(calls.find((c) => c.path.endsWith('/uploads'))?.body).toMatchObject({ kind: 'headshot' });
  expect(calls.find((c) => c.path.endsWith('/me/style/analyse'))?.body).toEqual({
    kind: 'colour',
    assetId: ASSET_ID,
  });
});

test('her photos: the system picker, then review; Retake opens the picker again', async () => {
  mockFetch(UPLOAD);
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValueOnce({ canceled: false, assets: [PICKED] } as never);
  await renderWithApi(<SelfieCamera />);
  await fireEvent.press(screen.getByRole('button', { name: copy.photos }));
  expect(await screen.findByTestId('selfie-review')).toBeTruthy();
  // Left empty, the picker hands her back to the camera.
  await fireEvent.press(screen.getByRole('button', { name: copy.retake }));
  await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(copy.hint)).toBeTruthy();
});

test('a photo that could not be sent says so and stays on review', async () => {
  mockFetch({ ...UPLOAD, 'POST /me/style/analyse': errorReply(500, 'internal') });
  await renderWithApi(<SelfieCamera />);
  await fireEvent.press(screen.getByRole('button', { name: copy.shutter }));
  await fireEvent.press(await screen.findByRole('button', { name: copy.use }));
  expect(await screen.findByText(you.style.failed)).toBeTruthy();
  expect(screen.getByTestId('selfie-review')).toBeTruthy();
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('a refused camera says so and offers Settings; her photos still work', async () => {
  mockGranted = false;
  mockCanAsk = false;
  mockFetch(UPLOAD);
  await renderWithApi(<SelfieCamera />);
  expect(screen.getByText(wardrobe.camera.unreachable)).toBeTruthy();
  expect(screen.getByRole('button', { name: wardrobe.camera.allow })).toBeTruthy();
  expect(screen.getByRole('button', { name: copy.shutter }).props.accessibilityState).toMatchObject(
    { disabled: true },
  );
  expect(screen.getByRole('button', { name: copy.photos })).toBeTruthy();
});

test('× leaves the camera', async () => {
  mockFetch(UPLOAD);
  await renderWithApi(<SelfieCamera />);
  await fireEvent.press(screen.getByRole('button', { name: copy.close }));
  expect(mockRouter.back).toHaveBeenCalled();
});
