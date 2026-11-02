import type { Today } from '@robes/contracts';
import { diary } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DayOneBand } from '../src/features/home/DayOneBand';
import { mockFetch, renderWithApi } from './support/api';
import { modelData } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

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
const GENERICS = [
  { id: 'w-s1-h1-nt', imageUrl: null },
  { id: 'w-s3-h2-nt', imageUrl: 'https://media.test/catalog/w-s3-h2-nt.png' },
  { id: 'w-s5-h3-nt', imageUrl: null },
];
const ROUTES = {
  'GET /me/model': modelData({ generics: GENERICS }),
  'GET /today': {},
};

test('day one shows both asks: the twin’s door, the three models, the four piece tiles', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DayOneBand state={dayOne} />);
  expect(screen.getByTestId('day-one')).toBeTruthy();
  expect(screen.getByText(copy.model)).toBeTruthy();
  expect(screen.getByText(copy.pieces)).toBeTruthy();
  expect(screen.getByRole('button', { name: copy.twin })).toBeTruthy();
  expect(screen.getByRole('button', { name: copy.another })).toBeTruthy();
  for (const what of copy.tiles) {
    expect(screen.getByRole('button', { name: copy.tile(what) })).toBeTruthy();
  }
  // The first Robes model stands chosen until she has one on file.
  const first = await screen.findByTestId('day-one-model-0');
  expect(first.props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByTestId('day-one-model-1').props.accessibilityState).toEqual({
    checked: false,
  });
  await fireEvent.press(screen.getByRole('button', { name: copy.twin }));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/model');
});

test('picking a Robes model files its skin and hair', async () => {
  const calls = mockFetch({
    ...ROUTES,
    'PATCH /me/model': (init: RequestInit) =>
      modelData({ filed: true, generics: GENERICS, ...JSON.parse(String(init.body)) }),
  });
  await renderWithApi(<DayOneBand state={dayOne} />);
  await fireEvent.press(await screen.findByTestId('day-one-model-1'));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ skin: 3, hair: 2 }),
  );
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
