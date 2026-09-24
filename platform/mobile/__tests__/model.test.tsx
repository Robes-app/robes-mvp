import { you } from '@robes/copy';
import { HAIR_SWATCHES, SKIN_SWATCHES } from '@robes/core/avatar';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { LookDetail } from '../src/features/looks/LookDetail';
import { Model } from '../src/features/you/Model';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const copy = you.model;
const model = (over: object = {}) => ({
  filed: false,
  presence: 'woman',
  skin: 3,
  hair: 1,
  line: null,
  frame: null,
  source: 'hand',
  reads: { colour: false, silhouette: false },
  cellId: 'w-s3-h1-nt',
  cell: { status: 'none', imageUrl: null },
  swatches: { skin: [...SKIN_SWATCHES], hair: [...HAIR_SWATCHES] },
  ...over,
});

test('she builds her model by hand and each pick re-files it', async () => {
  const calls = mockFetch({
    'GET /me/model': model(),
    'PATCH /me/model': (init: RequestInit) =>
      model({ filed: true, ...JSON.parse(String(init.body)) }),
    'GET /today': {},
  });
  await renderWithApi(<Model />);
  expect(await screen.findByText(copy.empty)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.build }));
  await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({}));
  await fireEvent.press(screen.getByRole('button', { name: 'Porcelain' }));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toEqual({ skin: 7 }),
  );
  expect(await screen.findByText(copy.subtitle)).toBeTruthy();
});

test('says so while her portrait is being drawn', async () => {
  mockFetch({
    'GET /me/model': model({ filed: true, cell: { status: 'pending', imageUrl: null } }),
  });
  await renderWithApi(<Model />);
  expect(await screen.findByText(copy.creating)).toBeTruthy();
});

test('a look offers See it on me once her model is ready, and asks for the render', async () => {
  const withPiece = look();
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: withPiece,
    'GET /me/model': model({
      filed: true,
      cell: { status: 'ready', imageUrl: 'https://media.test/catalog/avatar/w-s3-h1-nt@v2.png' },
    }),
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: '66666666-6666-4666-8666-666666666666',
      status: 'queued',
    },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: copy.seeOnMe }));
  await waitFor(() =>
    expect(
      calls.some((c) => c.method === 'POST' && c.path.endsWith(`/looks/${LOOK_ID}/render`)),
    ).toBe(true),
  );
});

test('without a model the look points her to build one', async () => {
  mockFetch({ [`GET /looks/${LOOK_ID}`]: look(), 'GET /me/model': model() });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByRole('button', { name: copy.build })).toBeTruthy();
});
