import type { Today } from '@robes/contracts';
import { diary } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { DayOneBand } from '../src/features/home/DayOneBand';
import { mockFetch, renderWithApi } from './support/api';
import { modelData } from './support/fixtures';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  CameraType: { front: 'front', back: 'back' },
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

beforeEach(() => jest.clearAllMocks());

const copy = diary.dayOne;
type State = Today['home']['state'];
const dayOne: State = {
  styleConfirmed: false,
  twinOnFile: false,
  pics: 0,
  ownLookSaved: false,
  snoozed: {},
};
const ROBES_MODELS = [1, 2, 3, 4, 5].map((n) => ({
  id: `w-r${n}`,
  n,
  imageUrl: n === 2 ? 'https://media.test/catalog/avatar/w-r2@v1.png' : null,
  status: n === 2 ? 'ready' : 'none',
}));
const stand = { imageUrl: null, generic: true, on: 'robes' };
const ROUTES = {
  'GET /me/model': modelData({ robesModels: ROBES_MODELS, stand }),
  'GET /today': {},
};

test('day one shows both asks: the twin’s door, the five Robes models, the four piece tiles', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DayOneBand state={dayOne} />);
  expect(screen.getByTestId('day-one')).toBeTruthy();
  expect(screen.getByText(copy.model)).toBeTruthy();
  expect(screen.getByText(copy.pieces)).toBeTruthy();
  expect(screen.getByRole('button', { name: copy.twin })).toBeTruthy();
  for (const what of copy.tiles) {
    expect(screen.getByRole('button', { name: copy.tile(what) })).toBeTruthy();
  }
  // The first of the five Robes models stands chosen until she chooses one.
  const first = await screen.findByTestId('day-one-model-0');
  expect(screen.getAllByRole('radio')).toHaveLength(5);
  expect(first.props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByTestId('day-one-model-1').props.accessibilityState).toEqual({
    checked: false,
  });
  // Create your digital twin opens the front camera at once (plan 2026-11-05), no screen between.
  await fireEvent.press(screen.getByRole('button', { name: copy.twin }));
  await waitFor(() =>
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ cameraType: 'front' }),
    ),
  );
});

test('picking a Robes model is remembered as a pick, never as skin and hair', async () => {
  const calls = mockFetch({
    ...ROUTES,
    'PATCH /me/model': (init: RequestInit) =>
      modelData({ robesModels: ROBES_MODELS, stand, ...JSON.parse(String(init.body)) }),
  });
  await renderWithApi(<DayOneBand state={dayOne} />);
  await fireEvent.press(await screen.findByTestId('day-one-model-3'));
  await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ preset: 4 }));
});

test('her own twin on file: no Robes model is ticked', async () => {
  mockFetch({
    ...ROUTES,
    'GET /me/model': modelData({
      robesModels: ROBES_MODELS,
      stand: { imageUrl: null, generic: false, on: 'twin' },
    }),
  });
  await renderWithApi(<DayOneBand state={dayOne} />);
  const first = await screen.findByTestId('day-one-model-0');
  expect(first.props.accessibilityState).toEqual({ checked: false });
});

test('× asks once; Okay dismisses the model ask for good and the section leaves', async () => {
  const calls = mockFetch({ ...ROUTES, 'POST /me/notifications/dismiss': { ok: true } });
  await renderWithApi(<DayOneBand state={dayOne} />);
  expect(screen.queryByText(copy.modelAsk)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: `${copy.dismiss}: ${copy.model}` }));
  expect(await screen.findByText(copy.modelAsk)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.ok }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/notifications/dismiss'))?.body).toEqual({
      key: 'dayone:model',
    }),
  );
  expect(screen.queryByTestId('day-one-model')).toBeNull();
  // The pieces ask still stands; the band with it.
  expect(screen.getByTestId('day-one-pieces')).toBeTruthy();
  expect(screen.getByTestId('day-one')).toBeTruthy();
});

test('a dismissed ask stays down', async () => {
  mockFetch(ROUTES);
  await renderWithApi(
    <DayOneBand state={{ ...dayOne, dayOne: { modelAsked: true, piecesAsked: false } }} />,
  );
  expect(screen.queryByTestId('day-one-model')).toBeNull();
  expect(screen.getByTestId('day-one-pieces')).toBeTruthy();
});

test('with a twin on file and pieces in, no band at all', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DayOneBand state={{ ...dayOne, twinOnFile: true, pics: 4 }} />);
  expect(screen.queryByTestId('day-one')).toBeNull();
});
