import { lookbook, photoPieces, shell } from '@robes/copy';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { LookFromPhoto } from '../src/features/photo-pieces/LookFromPhoto';
import { mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, JOB_ID, LOOK_ID, look, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///tmp/run.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048,
        width: 800,
        height: 1000,
      },
    ],
  })),
}));

const copy = photoPieces;
const SHOES = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const crop = (i: number) => `cccccccc-cccc-4ccc-8ccc-cccccccccc0${i}`;

function readPiece(index: number, label: string, category: string, over: object = {}) {
  return {
    index,
    label,
    category,
    categoryL2: null,
    categoryL3: null,
    color: null,
    brand: null,
    notes: null,
    box: { x: 0.3, y: 0.1 + index * 0.3, w: 0.4, h: 0.2 },
    match: null,
    cropAssetId: crop(index),
    ...over,
  };
}

const READ = [
  readPiece(0, 'Cream long-sleeve t-shirt', 'Tops'),
  readPiece(1, 'Black leggings', 'Bottoms'),
  readPiece(2, 'White running shoes', 'Shoes', {
    brand: 'Salomon',
    match: { pieceId: SHOES, confidence: 0.8 },
  }),
];

function routes(extra: Record<string, unknown>) {
  return mockFetch({
    'GET /wardrobe/items': {
      items: [
        piece({
          id: SHOES,
          label: 'White running shoes',
          category: 'Shoes',
          categoryL2: 'Trainers',
          image: null,
        }),
      ],
      nextCursor: null,
    },
    'GET file:///tmp/run.jpg': {},
    'POST /uploads': {
      assetId: ASSET_ID,
      upload: {
        method: 'PUT',
        url: 'http://minio.test/put',
        headers: {},
        expiresAt: '2026-10-15T11:00:00.000Z',
      },
    },
    'PUT /put': {},
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
      output: { assetId: ASSET_ID, noItemDetected: false, readPieces: READ },
      error: null,
      cancelRequested: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      finishedAt: '2026-10-15T10:00:01.000Z',
    },
    ...extra,
  });
}

beforeEach(() => jest.clearAllMocks());

test('a look from a photo: hers, new and left out, then saved with the wear', async () => {
  const calls = routes({ [`POST /wardrobe/photo-reads/${JOB_ID}/look`]: look() });
  await renderWithApi(<LookFromPhoto />);
  await fireEvent.press(await screen.findByRole('button', { name: shell.create.cameraRoll }));
  const shoes = await screen.findByTestId('read-card-2');
  expect(within(shoes).getByText(copy.look.askMatch('White running shoes'))).toBeTruthy();
  expect(within(screen.getByTestId('read-card-0')).getByText(copy.look.askNew)).toBeTruthy();
  expect(screen.getByText(copy.look.gate(3))).toBeTruthy();
  expect(
    screen.getByRole('button', { name: copy.look.save }).props.accessibilityState.disabled,
  ).toBe(true);

  await fireEvent.press(within(shoes).getByRole('button', { name: copy.look.yes }));
  await fireEvent.press(
    within(screen.getByTestId('read-card-0')).getByRole('button', { name: copy.look.leaveOut }),
  );
  await fireEvent.press(
    within(screen.getByTestId('read-card-1')).getByRole('button', { name: copy.look.find }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: copy.look.findNone }));
  expect(screen.getByText(copy.look.newRow)).toBeTruthy();
  expect(screen.getByText(copy.look.head(2))).toBeTruthy();

  // The read runs inside the draft now: the name is the draft's own masthead line.
  await fireEvent.changeText(screen.getByLabelText(lookbook.name.label), 'Sunday run');
  await fireEvent(screen.getByLabelText(copy.look.wearToday), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: copy.look.save }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
  const body = calls.find((c) => c.path.endsWith('/look'))?.body as Record<string, unknown>;
  expect(body).toMatchObject({
    answers: [
      { index: 0, state: 'skip' },
      { index: 1, state: 'new' },
      { index: 2, state: 'owned', pieceId: SHOES },
    ],
    name: 'Sunday run',
  });
  expect(body.wornOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
