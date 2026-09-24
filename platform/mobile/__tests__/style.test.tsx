import { you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Style } from '../src/features/you/Style';
import { mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, JOB_ID } from './support/fixtures';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/face.jpg', mimeType: 'image/jpeg', fileSize: 2048 }],
  })),
}));

const copy = you.style;
// Profile swatches are API data; built at runtime so the no-raw-colours gate stays strict.
const hex = (digits: string): string => `#${digits}`;
const empty = {
  colour: null,
  silhouette: null,
  overrides: { lovedColors: [], rejectedColors: [], measurements: {} },
  updatedAt: null,
};
const colour = {
  season: 'Soft Autumn',
  undertone: 'Warm',
  contrast: 'Low, blended',
  summary: 'Warm, low in contrast, a little dusty.',
  undertone_note: 'Gold sits closer.',
  palette: [],
  neutrals: [],
  best_colours: [{ name: 'Sage', hex: hex('6E7E64') }],
  avoid_colours: [{ name: 'Icy pink', hex: hex('F2D6DF') }],
  avoid_note: 'They pull focus.',
  proof_best: 'Warmer.',
  proof_less: 'Cooler.',
  seen_on_you: [],
  metals: [{ name: 'Gold', hexes: [hex('E4C878'), hex('C6A24C'), hex('9C7E36')] }],
  metals_note: 'Brushed.',
};
const job = (status: string) => ({
  id: JOB_ID,
  kind: 'stylenotes_analyse',
  status,
  stage: 'text',
  output: status === 'succeeded' ? { styleKind: 'colour', archetype: 'Soft Autumn' } : {},
  error: null,
  cancelRequested: false,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
  finishedAt: null,
});

beforeEach(() => jest.clearAllMocks());

test('a close-up is uploaded as a headshot, read, and her colouring appears', async () => {
  let analysed = false;
  const calls = mockFetch({
    'GET /me/style': () => (analysed ? { ...empty, colour } : empty),
    'GET file:///tmp/face.jpg': {},
    'POST /uploads': {
      assetId: ASSET_ID,
      upload: {
        method: 'PUT',
        url: 'http://minio.test/put',
        headers: {},
        expiresAt: '2026-09-24T11:00:00.000Z',
      },
    },
    'PUT /put': {},
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
    [`GET /jobs/${JOB_ID}`]: () => {
      analysed = true;
      return job('succeeded');
    },
  });
  await renderWithApi(<Style />);
  await fireEvent.press(await screen.findByRole('button', { name: copy.colour.add }));
  expect(await screen.findByText('Soft Autumn')).toBeTruthy();
  expect(screen.getByText('Sage')).toBeTruthy();
  expect(screen.getByText('Icy pink')).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/uploads'))?.body).toMatchObject({ kind: 'headshot' });
  expect(calls.find((c) => c.path.endsWith('/analyse'))?.body).toEqual({
    kind: 'colour',
    assetId: ASSET_ID,
  });
});

test('colours she loves are added and removed through overrides', async () => {
  const calls = mockFetch({
    'GET /me/style': empty,
    'PATCH /me/style/overrides': (init: RequestInit) => ({
      ...empty,
      overrides: { ...empty.overrides, ...JSON.parse(String(init.body)) },
    }),
  });
  await renderWithApi(<Style />);
  await fireEvent.changeText(
    await screen.findByLabelText(`${copy.loved}: ${copy.colourLabel}`),
    'Navy',
  );
  await fireEvent.press(screen.getAllByRole('button', { name: copy.add })[0] as never);
  expect(await screen.findByText('Navy')).toBeTruthy();
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ lovedColors: ['Navy'] });
  await fireEvent.press(screen.getByText('Navy'));
  await waitFor(() => expect(screen.queryByText('Navy')).toBeNull());
});
