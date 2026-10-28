import { queryKeys } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { firstRun as copy, home } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import NameScreen from '../src/app/onboarding/index';
import FirstPiece from '../src/app/onboarding/piece';
import { nativeAnalytics } from '../src/lib/analytics';
import { errorReply, ME, mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, JOB_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/coat.jpg', mimeType: 'image/jpeg', fileSize: 2048 }],
  })),
  launchCameraAsync: jest.fn(),
}));

const SET_ID = '77777777-7777-4777-8777-777777777777';
const snap = (id: string, kind: string, output: object) => ({
  id,
  kind,
  status: 'succeeded',
  stage: 'done',
  output,
  error: null,
  cancelRequested: false,
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:01.000Z',
  finishedAt: '2026-10-01T08:00:01.000Z',
});
const READ_JOB = '99999999-9999-4999-8999-999999999999';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});
// Call sites report through the consent-gated client (observability.test.ts proves the gate).
const track = jest.spyOn(nativeAnalytics, 'track');

test('the splash hands to the name, which saves and moves to the first piece', async () => {
  const calls = mockFetch({
    'GET /me': { ...ME, firstName: null, onboarded: false },
    'PATCH /me': ME,
  });
  await renderWithApi(<NameScreen />);
  await fireEvent.press(screen.getByTestId('splash'));
  expect(screen.getByText(copy.name.notes)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(copy.name.label), 'Niall Maher');
  await fireEvent.press(screen.getByRole('button', { name: copy.name.continue }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/piece'));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ firstName: 'Niall' });
  expect(track.mock.calls).toEqual([
    ['onboarding_step', { step: 'name', outcome: 'shown' }],
    ['onboarding_step', { step: 'name', outcome: 'answered' }],
  ]);
});

test('the first piece is photographed, read into the ledger, styled three ways onto the deck; a retry reuses the job', async () => {
  let completes = 0;
  const filed = piece({ label: 'Camel wool coat', brand: 'Toteme', color: 'camel' });
  const calls = mockFetch({
    'GET /me': ME,
    'GET file:///tmp/coat.jpg': {},
    'POST /uploads': {
      assetId: ASSET_ID,
      upload: {
        method: 'PUT',
        url: 'http://minio.test/u',
        headers: {},
        expiresAt: '2026-10-01T00:00:00.000Z',
      },
    },
    'PUT /u': {},
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
      jobs: [{ pieceId: PIECE_ID, jobId: READ_JOB }],
    },
    [`GET /jobs/${READ_JOB}`]: snap(READ_JOB, 'wardrobe_analyse', {}),
    [`GET /wardrobe/items/${PIECE_ID}`]: filed,
    'POST /looks/generate': { jobId: JOB_ID, status: 'queued' },
    // The first finish fails: the retry must not mint a second generation.
    'POST /me/onboarding/complete': () =>
      ++completes === 1 ? errorReply(500, 'internal') : { onboardedAt: new Date().toISOString() },
    [`GET /jobs/${JOB_ID}`]: snap(JOB_ID, 'key_piece', { setId: SET_ID }),
    [`GET /looks/sets/${SET_ID}`]: {
      id: SET_ID,
      mode: 'piece',
      prompt: null,
      anchor: null,
      dateHint: null,
      jobId: JOB_ID,
      looks: [look({ status: 'suggested', name: 'Gallery Sunday' })],
    },
  });
  await renderWithApi(<FirstPiece />);
  await fireEvent.press(screen.getByRole('button', { name: copy.piece.add }));
  await fireEvent.press(await screen.findByRole('button', { name: home.plus.upload }));
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
  const style = await screen.findByRole('button', { name: copy.piece.style }, { timeout: 8_000 });
  expect(screen.getByText('Toteme')).toBeTruthy();
  await fireEvent.press(style);
  await fireEvent.press(await screen.findByRole('button', { name: copy.piece.style }));
  expect(await screen.findByTestId('composing')).toBeTruthy();
  expect(calls.filter((c) => c.path.endsWith('/looks/generate'))).toHaveLength(1);
  expect(await screen.findByText('Gallery Sunday')).toBeTruthy();
  await waitFor(
    () =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/looks/job/[jobId]',
        params: { jobId: JOB_ID, from: 'home' },
      }),
    {
      timeout: 8_000,
    },
  );
  expect(calls.find((c) => c.path.endsWith('/looks/generate'))?.body).toEqual({
    anchor: { type: 'piece', pieceId: PIECE_ID },
  });
  expect(calls.some((c) => c.path.endsWith('/me/onboarding/complete'))).toBe(true);
}, 20_000);

test('several pieces in the photo: she picks which first; it is styled, the others file quietly', async () => {
  const OTHER_ID = '88888888-8888-4888-8888-888888888888';
  const readPiece = (index: number, label: string) => ({
    index,
    label,
    category: 'Outerwear',
    categoryL2: null,
    categoryL3: null,
    color: null,
    brand: null,
    notes: null,
    box: { x: 0.1, y: 0.1, w: 0.4, h: 0.4 },
    match: null,
    cropAssetId: ASSET_ID,
  });
  const calls = mockFetch({
    'GET /me': ME,
    'GET file:///tmp/coat.jpg': {},
    'POST /uploads': {
      assetId: ASSET_ID,
      upload: {
        method: 'PUT',
        url: 'http://minio.test/u',
        headers: {},
        expiresAt: '2026-10-01T00:00:00.000Z',
      },
    },
    'PUT /u': {},
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
    'POST /wardrobe/photo-reads': { jobId: READ_JOB, status: 'queued' },
    [`GET /jobs/${READ_JOB}`]: snap(READ_JOB, 'wardrobe_pieces', {
      readPieces: [readPiece(0, 'Camel coat'), readPiece(1, 'Silk scarf')],
    }),
    [`POST /wardrobe/photo-reads/${READ_JOB}/file`]: {
      filed: [
        piece({ id: OTHER_ID, label: 'Camel coat' }),
        piece({ label: 'Silk scarf', brand: 'Hermès' }),
      ],
      photoAdded: [],
    },
    'POST /looks/generate': { jobId: JOB_ID, status: 'queued' },
    'POST /me/onboarding/complete': { onboardedAt: new Date().toISOString() },
    [`GET /jobs/${JOB_ID}`]: snap(JOB_ID, 'key_piece', {}),
  });
  await renderWithApi(<FirstPiece />);
  await fireEvent.press(screen.getByRole('button', { name: copy.piece.add }));
  await fireEvent.press(await screen.findByRole('button', { name: home.plus.upload }));
  expect(await screen.findByText(copy.piece.many(2), { exact: false })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Silk scarf' }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith(`/photo-reads/${READ_JOB}/file`))?.body).toEqual({
      answers: [
        { index: 0, state: 'add' },
        { index: 1, state: 'add' },
      ],
    }),
  );
  await fireEvent.press(
    await screen.findByRole('button', { name: copy.piece.style }, { timeout: 8_000 }),
  );
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/generate'))?.body).toEqual({
      anchor: { type: 'piece', pieceId: PIECE_ID },
    }),
  );
  expect(calls.some((c) => c.path.endsWith('/wardrobe/items/batch'))).toBe(false);
}, 20_000);

test('Skip takes two taps, then home with the cache already onboarded', async () => {
  mockFetch({
    'GET /me': ME,
    'POST /me/onboarding/complete': { onboardedAt: new Date().toISOString() },
  });
  const { queryClient } = await renderWithApi(<FirstPiece />);
  queryClient.setQueryData(queryKeys.call('me.get'), { ...ME, onboarded: false });
  await fireEvent.press(screen.getByRole('button', { name: copy.piece.skip }));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.piece.skipAnyway }));
  });
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  expect(queryClient.getQueryData<Me>(queryKeys.call('me.get'))?.onboarded).toBe(true);
  expect(track.mock.calls).toEqual([
    ['onboarding_step', { step: 'piece', outcome: 'shown' }],
    ['onboarding_step', { step: 'piece', outcome: 'skipped' }],
  ]);
});
