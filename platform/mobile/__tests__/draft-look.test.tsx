import { diary, lookbook } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DraftLook } from '../src/features/looks/DraftLook';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

const copy = lookbook.draftLook;
const SCARF = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const MODEL = {
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
  swatches: { skin: [], hair: [] },
  skinSet: false,
  hairSet: false,
  adj: { shoulders: null, bust: null, hips: null },
  closeUpUrl: null,
  twin: { status: 'none', current: false, imageUrl: null },
  stand: { imageUrl: 'https://m.test/w-s4-h1-nt.png', generic: true },
};
const BASE = {
  'GET /looks': { items: [], nextCursor: null },
  'GET /me/model': MODEL,
  'GET /today': { date: '2026-11-06', hour: 9, firstName: null, today: [], diary: null },
};

beforeEach(() => jest.clearAllMocks());

const draftOf = (overrides: Parameters<typeof look>[0] = {}) =>
  look({ status: 'draft', timesWorn: 0, lastWornOn: null, ...overrides });

test('a new look is a draft from the pieces she picks, then it carries on in the same sheet', async () => {
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Silk scarf', category: 'Accessories' })],
      nextCursor: null,
    },
    'POST /looks': draftOf(),
    [`GET /looks/${LOOK_ID}`]: draftOf(),
  });
  const onClose = jest.fn();
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={onClose} />);
  expect(await screen.findByText(copy.title)).toBeTruthy();
  // Nothing to keep yet: the done disc waits at 35%.
  expect(screen.getByTestId('draft-done').props.accessibilityState.disabled).toBe(true);
  // The add slot opens the piece picker: a search, Photograph one, a tick on every piece.
  await fireEvent.press(screen.getByRole('button', { name: lookbook.rack.addPiece }));
  expect(await screen.findByTestId('piece-picker')).toBeTruthy();
  expect(screen.getByLabelText(diary.flyout.search)).toBeTruthy();
  expect(screen.getByRole('button', { name: diary.flyout.photograph })).toBeTruthy();
  await fireEvent.press(
    await screen.findByRole('checkbox', { name: diary.flyout.pick('Silk scarf') }),
  );
  expect(screen.getByText(copy.picker.cta(1))).toBeTruthy();
  await fireEvent.press(screen.getByTestId('picker-confirm'));
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ id: LOOK_ID }));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    status: 'draft',
    pieces: [{ pieceId: SCARF }],
  });
  // The draft carries on in the same sheet: its rack, its prompt card.
  expect(await screen.findByTestId('prompt-card')).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
});

test('a sixth draft asks to let the oldest go, and only then makes room', async () => {
  let posts = 0;
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'POST /looks': () => {
      posts += 1;
      return posts === 1 ? errorReply(409, 'conflict', { reason: 'drafts_full' }) : draftOf();
    },
    'GET /looks': { items: [look({ name: 'Oldest draft', status: 'draft' })], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draftOf(),
  });
  await renderWithApi(
    <DraftLook id="new" pieceId={PIECE_ID} presentation="sheet" onClose={() => undefined} />,
  );
  expect(await screen.findByText(lookbook.drafts.fullTitle)).toBeTruthy();
  expect(screen.getByText(lookbook.drafts.fullBody('Oldest draft'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.drafts.letGo }));
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ id: LOOK_ID }));
  const sent = calls.filter((c) => c.method === 'POST').map((c) => c.body);
  expect(sent[0]).toEqual({
    status: 'draft',
    pieces: [{ pieceId: PIECE_ID }],
    anchorPieceId: PIECE_ID,
  });
  expect(sent[1]).toEqual({
    status: 'draft',
    pieces: [{ pieceId: PIECE_ID }],
    anchorPieceId: PIECE_ID,
    letGoOldest: true,
  });
});

// The one draft (D14): the picture is drawn only when she asks — here through the Generate chip,
// which reads "Update the model · 1" while the picture is behind.
test('a swap from the picker leaves the picture behind; the chip draws the model', async () => {
  const draft = draftOf({
    pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    model: piece().image,
    onModel: 'ready',
  });
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Navy silk top', category: 'Tops' })],
      nextCursor: null,
    },
    'POST /me/memory': { ok: true },
    [`GET /looks/${LOOK_ID}`]: draft,
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...draft,
      updatedAt: new Date().toISOString(),
      ...JSON.parse(String(init.body)),
      pieces: draft.pieces,
    }),
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId('draft-picture')).toBeTruthy();
  const renders = () => calls.filter((c) => c.method === 'POST' && c.url.endsWith('/render'));
  expect(renders()).toHaveLength(0);
  // The hanger opens the picker on the row's category; Swap it in lands the swap.
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  await fireEvent.press(
    await screen.findByRole('checkbox', { name: diary.flyout.pick('Navy silk top') }),
  );
  await fireEvent.press(screen.getByTestId('picker-confirm'));
  expect(await screen.findByText(lookbook.swap.swapped('Navy silk top'))).toBeTruthy();
  expect(await screen.findByTestId('draft-picture-stale')).toBeTruthy();
  expect(screen.getAllByLabelText(lookbook.draft.behind(1)).length).toBeGreaterThan(0);
  expect(renders()).toHaveLength(0);
  expect(screen.getByText(lookbook.draft.updateModel(1))).toBeTruthy();
  await fireEvent.press(screen.getByTestId('draft-generate'));
  await waitFor(() => expect(renders()).toHaveLength(1));
  expect(screen.getByText(lookbook.draft.modelAsked)).toBeTruthy();
  expect(screen.queryAllByLabelText(lookbook.draft.behind(1))).toHaveLength(0);
});

test('the adjust disc opens the AdjustSheet; her sentence goes through the look prompt', async () => {
  const draft = draftOf();
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draft,
    [`POST /looks/${LOOK_ID}/ask`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  await fireEvent.press(await screen.findByTestId('draft-adjust'));
  expect(await screen.findByTestId('adjust-sheet')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('adjust-sheet-field'), 'sleeves rolled up');
  await fireEvent.press(screen.getByRole('button', { name: copy.adjustSheet.send }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/ask'))?.body).toMatchObject({
      text: 'sleeves rolled up',
      surface: 'draft',
    }),
  );
  // The sheet closes behind the send; her words stand in the thread.
  expect(screen.queryByTestId('adjust-sheet')).toBeNull();
  expect(screen.getByText('sleeves rolled up')).toBeTruthy();
});

// Dress it again is the door into the DescribeSheet on a look Robes made: her sentence re-writes it.
test('Dress it again opens the DescribeSheet; Send re-writes the look from her sentence', async () => {
  const SET = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const draft = draftOf({ setId: SET, setIndex: 0 });
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draft,
    [`POST /looks/${LOOK_ID}/restyle`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.draft.redress }));
  expect(await screen.findByTestId('describe-sheet')).toBeTruthy();
  // The count chip opens to one chip per piece.
  expect(screen.getByText(copy.describeSheet.pieces(1))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.describeSheet.show }));
  // The piece's chip, beside its row on the rack.
  expect(screen.getAllByText('Camel wool coat').length).toBeGreaterThan(1);
  await fireEvent.changeText(screen.getByTestId('describe-sheet-field'), 'more casual');
  await fireEvent.press(screen.getByRole('button', { name: copy.describeSheet.send }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/restyle'))?.body).toEqual({ note: 'more casual' }),
  );
  expect(screen.queryByTestId('describe-sheet')).toBeNull();
  expect(screen.getByText(lookbook.draft.dressingAgain)).toBeTruthy();
});

test('closing asks: Discard lets the draft go, Keep for later only closes', async () => {
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draftOf(),
    [`DELETE /looks/${LOOK_ID}`]: { ok: true },
  });
  const onClose = jest.fn();
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={onClose} />);
  expect(await screen.findByTestId('prompt-card')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('draft-close'));
  expect(await screen.findByText(copy.discard.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.discard.later }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  await fireEvent.press(screen.getByTestId('draft-close'));
  await fireEvent.press(await screen.findByRole('button', { name: copy.discard.discard }));
  await act(async () => {
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  });
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('a saved look opens the same sheet in edit mode: Update look waits, Delete lives here', async () => {
  mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: look(),
  });
  const onClose = jest.fn();
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={onClose} />);
  expect(await screen.findByText(copy.editTitle)).toBeTruthy();
  const done = screen.getByTestId('draft-done');
  expect(done.props.accessibilityLabel).toBe(copy.doneEdit);
  expect(done.props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText(copy.regenerate)).toBeTruthy();
  expect(screen.getByText(copy.delete)).toBeTruthy();
  // Nothing changed: × closes without a question.
  await fireEvent.press(screen.getByTestId('draft-close'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(copy.discardEdit.title)).toBeNull();
});

test('a render that failed says so on the picture', async () => {
  mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draftOf({
      onModel: 'failed',
      pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    }),
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByText(lookbook.figure.undressed('her'))).toBeTruthy();
});
