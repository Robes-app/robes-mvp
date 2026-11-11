import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AddPiecesPanel } from '../src/features/wardrobe/add/AddPiecesPanel';
import { sitting } from '../src/features/wardrobe/add/flow';
import { ManualAdd } from '../src/features/wardrobe/add/ManualAdd';
import { Review } from '../src/features/wardrobe/add/Review';
import { nativeAnalytics } from '../src/lib/analytics';
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
// Call sites report through the consent-gated client (observability.test.ts proves the gate).
const track = jest.spyOn(nativeAnalytics, 'track');
const ENTRY_ID = '99999999-9999-4999-8999-999999999999';

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockParams)) delete mockParams[k];
  sitting.takeEmptied();
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

const cap = wardrobe.capture;
const JOB_B = '77777777-7777-4777-8777-777777777777';
const SHOT_B = { uri: 'file:///tmp/b.jpg', width: 800, height: 1000, jobId: JOB_B };

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

test('the list shows one row per piece, and a row for a photograph still being read', async () => {
  mockFetch({
    ...READ,
    [`GET /jobs/${JOB_B}`]: { ...READ[`GET /jobs/${JOB_ID}`], id: JOB_B, status: 'running' },
  });
  await renderWithApi(<Review to="wardrobe" from="camera" shots={[SHOT, SHOT_B]} link={null} />);
  await waitFor(() => expect(screen.getAllByTestId('review-row')).toHaveLength(2));
  expect(screen.getByText(cap.review.head(3))).toBeTruthy();
  expect(screen.getByText(cap.review.sub)).toBeTruthy();
  expect(screen.getAllByTestId('review-reading')).toHaveLength(1);
  expect(screen.getByText(cap.review.reading)).toBeTruthy();
  // Nothing is added while a photograph is still being read.
  expect(screen.getByTestId('review-add').props.accessibilityState.disabled).toBe(true);
});

test('removing rows goes list, then the one piece, then back to the camera', async () => {
  const calls = mockFetch(READ);
  await renderWithApi(<Review to="wardrobe" from="camera" shots={[SHOT]} link={null} />);
  await waitFor(() => expect(screen.getAllByTestId('review-row')).toHaveLength(2));
  await fireEvent.press(screen.getByRole('button', { name: cap.review.remove('Cream tee') }));
  // One left: its own page, with the one button to add it.
  expect(await screen.findByText(cap.review.one)).toBeTruthy();
  expect(screen.queryByTestId('review-row')).toBeNull();
  expect(screen.getByRole('button', { name: cap.review.add(1, 'wardrobe') })).toBeTruthy();
  expect(screen.getByText(cap.review.footnote)).toBeTruthy();
  // "+ Add another piece" goes back to the camera beneath, the sitting kept.
  await fireEvent.press(screen.getByTestId('review-another'));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(sitting.takeEmptied()).toBe(false);
  expect(calls.some((c) => c.path.endsWith('/file'))).toBe(false);
});

test('a piece opened from the list reads "piece k of n" and can be removed there', async () => {
  mockFetch(READ);
  await renderWithApi(<Review to="wardrobe" from="camera" shots={[SHOT]} link={null} />);
  await waitFor(() => expect(screen.getAllByTestId('review-row')).toHaveLength(2));
  await fireEvent.press(screen.getByRole('button', { name: cap.review.open('Cream tee') }));
  expect(await screen.findByText(cap.review.of(1, 2))).toBeTruthy();
  expect(screen.getByRole('button', { name: cap.review.done })).toBeTruthy();
  await fireEvent.press(screen.getByTestId('review-remove-piece'));
  // One left: its own page, which adds it or goes back for another.
  expect(await screen.findByText(cap.review.one)).toBeTruthy();
  expect(screen.queryByTestId('review-remove-piece')).toBeNull();
});

test('an edit on a piece shows on the list and rides the filing; Add N files and toasts', async () => {
  const calls = mockFetch(READ);
  await renderWithApi(<Review to="wishlist" from="roll" shots={[SHOT]} link={null} />);
  await waitFor(() => expect(screen.getAllByTestId('review-row')).toHaveLength(2));
  await fireEvent.press(screen.getByRole('button', { name: cap.review.open('Cream tee') }));
  await fireEvent.press(
    await screen.findByRole('button', { name: `${wardrobe.piece.brand}: ${wardrobe.piece.add}` }),
  );
  await fireEvent.changeText(screen.getByLabelText(wardrobe.piece.brand), 'Toteme');
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.saveField }));
  });
  await fireEvent.press(screen.getByTestId('review-done'));
  // Her edit is on the list.
  await waitFor(() => expect(screen.getAllByTestId('review-row')).toHaveLength(2));
  expect(screen.getByText(/Toteme/)).toBeTruthy();
  // Nothing has filed yet.
  expect(calls.some((c) => c.path.endsWith('/file'))).toBe(false);
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: cap.review.add(2, 'wishlist') }));
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/file'))).toBe(true));
  expect(calls.filter((c) => c.path.endsWith('/file'))).toHaveLength(1);
  expect(calls.find((c) => c.path.endsWith('/file'))?.body).toEqual({
    to: 'wishlist',
    answers: [
      { index: 0, state: 'add', edits: { brand: 'Toteme', label: 'Cream tee' } },
      { index: 1, state: 'add', edits: { label: 'Black leggings' } },
    ],
  });
  expect(await screen.findByText(cap.added(2, 'wishlist'))).toBeTruthy();
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/wardrobe?segment=wishlist'),
  );
  expect(track.mock.calls).toEqual([
    ['pieces_filed', { source: 'photo', n: 2, skipped: 0, to: 'wishlist' }],
  ]);
});

test('a removed piece is skipped in the filing, so its crop is let go', async () => {
  const calls = mockFetch(READ);
  await renderWithApi(<Review to="wardrobe" from="camera" shots={[SHOT]} link={null} />);
  await waitFor(() => expect(screen.getAllByTestId('review-row')).toHaveLength(2));
  await fireEvent.press(screen.getByRole('button', { name: cap.review.remove('Black leggings') }));
  await act(async () => {
    await fireEvent.press(
      await screen.findByRole('button', { name: cap.review.add(1, 'wardrobe') }),
    );
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/file'))).toBe(true));
  expect(calls.find((c) => c.path.endsWith('/file'))?.body).toEqual({
    to: 'wardrobe',
    answers: [
      { index: 0, state: 'add', edits: { label: 'Cream tee' } },
      { index: 1, state: 'skip' },
    ],
  });
  expect(await screen.findByText(cap.added(1, 'wardrobe'))).toBeTruthy();
  // The camera beneath starts afresh, and the wardrobe takes its place.
  expect(sitting.takeEmptied()).toBe(true);
  expect(mockRouter.replace).toHaveBeenLastCalledWith('/wardrobe');
});

test('a link is reviewed as one piece and filed through its Inbox entry', async () => {
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
  expect(await screen.findByText(cap.review.one)).toBeTruthy();
  // A link has no camera behind it.
  expect(screen.queryByTestId('review-another')).toBeNull();
  const add = await screen.findByRole('button', { name: cap.review.add(1, 'wardrobe') });
  await waitFor(() => expect(add.props.accessibilityState.disabled).toBe(false));
  await act(async () => {
    await fireEvent.press(add);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/decide'))).toBe(true));
  expect(calls.find((c) => c.path.endsWith('/decide'))?.body).toEqual({
    action: 'wardrobe',
    itemIndexes: [0],
  });
  expect(await screen.findByText(cap.added(1, 'wardrobe'))).toBeTruthy();
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
