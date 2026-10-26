import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { AddPiecesPanel } from '../src/features/wardrobe/add/AddPiecesPanel';
import { ManualAdd } from '../src/features/wardrobe/add/ManualAdd';
import { Review } from '../src/features/wardrobe/add/Review';
import { mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, JOB_ID, PIECE_ID, piece } from './support/fixtures';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

const add = wardrobe.add;
const ENTRY_ID = '99999999-9999-4999-8999-999999999999';

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockParams)) delete mockParams[k];
  // The scan plays in full at once, so a test answers the piece it sees.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});

function readPiece(index: number) {
  return {
    index,
    label: index ? 'Black leggings' : 'Cream tee',
    category: index ? 'Bottoms' : 'Tops',
    categoryL2: null,
    categoryL3: null,
    color: 'Soft black',
    brand: null,
    notes: null,
    box: { x: 0, y: 0, w: 1, h: 1 },
    match: null,
    cropAssetId: ASSET_ID,
  };
}

const READ = {
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
  [`POST /wardrobe/photo-reads/${JOB_ID}/file`]: { filed: [], wished: [], photoAdded: [] },
  'GET /wardrobe/items': { items: [], nextCursor: null },
  'GET /wishlist/items': { items: [], nextCursor: null },
};

const SHOT = { uri: 'file:///tmp/a.jpg', width: 800, height: 1000, jobId: JOB_ID };

const fileButton = (to: 'wardrobe' | 'wishlist', next: boolean) =>
  screen.findByRole('button', { name: add.review.file(to, next) });

test('the sheet carries where the pieces go into every door', async () => {
  await renderWithApi(<AddPiecesPanel />);
  await fireEvent.press(screen.getByRole('radio', { name: add.to.wishlist }));
  await fireEvent.press(screen.getByRole('button', { name: add.doors.photograph }));
  expect(mockRouter.replace).toHaveBeenLastCalledWith({
    pathname: '/wardrobe/camera',
    params: { to: 'wishlist' },
  });
  await fireEvent.press(screen.getByRole('button', { name: add.doors.link }));
  expect(mockRouter.replace).toHaveBeenLastCalledWith({
    pathname: '/wardrobe/link',
    params: { to: 'wishlist' },
  });
  await fireEvent.press(screen.getByRole('button', { name: add.doors.manual }));
  expect(mockRouter.replace).toHaveBeenLastCalledWith({
    pathname: '/wardrobe/manual',
    params: { to: 'wishlist' },
  });
  await fireEvent.press(screen.getByRole('button', { name: add.doors.receipt }));
  expect(mockRouter.replace).toHaveBeenLastCalledWith('/wardrobe/receipt');
});

test('Review walks the pieces one at a time and files the read once each is answered', async () => {
  const calls = mockFetch(READ);
  await renderWithApi(<Review to="wardrobe" from="camera" shots={[SHOT]} link={null} />);
  // Two pieces: the first says there is another to come.
  await fireEvent.press(await fileButton('wardrobe', true));
  // Nothing files until every piece in the photo is answered.
  expect(calls.some((c) => c.path.endsWith('/file'))).toBe(false);
  await fireEvent.press(await screen.findByRole('button', { name: add.review.notThis }));
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/file'))).toBe(true));
  expect(calls.find((c) => c.path.endsWith('/file'))?.body).toEqual({
    to: 'wardrobe',
    answers: [
      { index: 0, state: 'add', edits: { label: 'Cream tee' } },
      { index: 1, state: 'skip' },
    ],
  });
  expect(await screen.findByText(add.filed.line.wardrobe)).toBeTruthy();
});

test('a row she changes on Review rides the filing, and the wishlist is the destination', async () => {
  const calls = mockFetch(READ);
  await renderWithApi(<Review to="wishlist" from="roll" shots={[SHOT]} link={null} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${wardrobe.piece.brand}: ${wardrobe.piece.add}` }),
  );
  await fireEvent.changeText(screen.getByLabelText(wardrobe.piece.brand), 'Toteme');
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.saveField }));
  });
  await fireEvent.press(await fileButton('wishlist', true));
  await fireEvent.press(await fileButton('wishlist', false));
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/file'))).toBe(true));
  const body = calls.find((c) => c.path.endsWith('/file'))?.body as {
    to: string;
    answers: Array<{ index: number; state: string; edits?: Record<string, unknown> }>;
  };
  expect(body.to).toBe('wishlist');
  expect(body.answers[0]).toEqual({
    index: 0,
    state: 'add',
    edits: { brand: 'Toteme', label: 'Cream tee' },
  });
  expect(body.answers[1]).toEqual({ index: 1, state: 'add', edits: { label: 'Black leggings' } });
  expect(await screen.findByText(add.filed.line.wishlist(2))).toBeTruthy();
});

test('a link is reviewed like a photo and filed through its Inbox entry', async () => {
  const calls = mockFetch({
    [`GET /inbox/${ENTRY_ID}`]: {
      id: ENTRY_ID,
      source: 'link',
      retailer: 'Arket',
      subject: null,
      items: [
        {
          index: 0,
          label: 'Wool coat',
          brand: 'Arket',
          price: 250,
          currency: 'EUR',
          sourceUrl: null,
        },
      ],
      receivedAt: '2026-10-15T10:00:00.000Z',
    },
    [`POST /inbox/${ENTRY_ID}/decide`]: {
      id: ENTRY_ID,
      status: 'filed',
      filedTo: 'wardrobe',
      filedIds: [PIECE_ID],
    },
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<Review to="wardrobe" from={null} shots={[]} link={ENTRY_ID} />);
  expect(await screen.findByText(add.review.sub.link)).toBeTruthy();
  // A link has no photograph to retake.
  expect(screen.queryByRole('button', { name: add.review.retake })).toBeNull();
  await fireEvent.press(await fileButton('wardrobe', false));
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/decide'))).toBe(true));
  expect(calls.find((c) => c.path.endsWith('/decide'))?.body).toEqual({
    action: 'wardrobe',
    itemIndexes: [0],
  });
  expect(await screen.findByText(add.filed.line.wardrobe)).toBeTruthy();
});

test('without a photo, the piece waits for a category; nothing files before it', async () => {
  const calls = mockFetch({
    'POST /wardrobe/items': piece({ label: 'Navy blazer' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<ManualAdd to="wardrobe" />);
  const commit = screen.getByRole('button', { name: add.file('wardrobe') });
  expect(commit.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(commit);
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
  // The photo comes last, and later.
  expect(screen.getByRole('button', { name: add.manual.addPhoto })).toBeTruthy();
});
