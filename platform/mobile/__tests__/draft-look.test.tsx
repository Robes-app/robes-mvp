import { diary, lookbook, wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { DraftLook } from '../src/features/looks/DraftLook';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

const mockTakePicture = jest.fn(async () => ({
  uri: 'file:///tmp/look.jpg',
  width: 1200,
  height: 1600,
  format: 'jpg' as const,
}));
jest.mock('expo-camera', () => {
  const { useEffect } = require('react');
  const request = jest.fn(async () => ({ granted: true }));
  return {
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, request],
    // The preview renders nothing here; it hands back the shutter's ref and reports itself ready.
    CameraView: ({
      ref,
      onCameraReady,
    }: {
      ref?: { current: unknown };
      onCameraReady?: () => void;
    }) => {
      useEffect(() => {
        if (ref) ref.current = { takePictureAsync: mockTakePicture };
        onCameraReady?.();
      });
      return null;
    },
  };
});

const copy = lookbook.draftLook;
const cam = lookbook.savedLook.manager.camera;
const UPLOAD = {
  'POST /uploads': {
    assetId: ASSET_ID,
    upload: {
      method: 'PUT',
      url: 'http://minio.test/put',
      headers: { 'content-type': 'image/jpeg' },
      expiresAt: '2026-11-10T11:00:00.000Z',
    },
  },
  'PUT /put': {},
  [`POST /uploads/${ASSET_ID}/complete`]: {
    id: ASSET_ID,
    kind: 'look_photo',
    status: 'pending',
    width: null,
    height: null,
    blurhash: null,
    master: null,
    renditions: [],
  },
};
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
const WISH_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const wish = {
  id: WISH_ID,
  label: 'Black leather loafers',
  category: 'Shoes',
  categoryL2: null,
  categoryL3: null,
  color: 'black',
  brand: 'Toteme',
  note: null,
  price: 390,
  currency: 'EUR',
  size: null,
  sourceUrl: null,
  sourceLabel: 'toteme.com',
  image: null,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
};
const BASE = {
  'GET /looks': { items: [], nextCursor: null },
  'GET /me/model': MODEL,
  'GET /today': { date: '2026-11-06', hour: 9, firstName: null, today: [], diary: null },
  // Two pieces filed: the Rack card opens the picker and the Shop toggle rests off.
  'GET /wardrobe/summary': {
    total: 2,
    categories: [
      { category: 'Outerwear', count: 1 },
      { category: 'Accessories', count: 1 },
    ],
  },
  'GET /wishlist/items': { items: [wish], nextCursor: null },
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
  // The Rack card (PRD rev 3 §4.6) opens the piece picker: OWNED · WISHLIST · SHOP, a search,
  // Photograph one, a tick on every piece.
  await fireEvent.press(await screen.findByRole('button', { name: copy.rackCard.pick }));
  expect(await screen.findByTestId('piece-picker')).toBeTruthy();
  expect(screen.getByRole('tab', { name: wardrobe.segments.wishlist })).toBeTruthy();
  expect(
    screen.getByRole('tab', { name: wardrobe.segments.shop }).props.accessibilityState.disabled,
  ).toBe(true);
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
  // The draft carries on in the same sheet: its rack under its heading, the styling card.
  expect(await screen.findByTestId('styling-card')).toBeTruthy();
  expect(screen.getByTestId('the-rack')).toBeTruthy();
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
  // The pencil shows the hanger; it opens the picker on the row's category; Swap it in lands it.
  await fireEvent.press(await screen.findByTestId('rack-pencil'));
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  await fireEvent.press(
    await screen.findByRole('checkbox', { name: diary.flyout.pick('Navy silk top') }),
  );
  await fireEvent.press(screen.getByTestId('picker-confirm'));
  expect(await screen.findByText(lookbook.swap.swapped('Navy silk top'))).toBeTruthy();
  expect(await screen.findByTestId('draft-picture-stale')).toBeTruthy();
  // The picture shows it's behind on its own; no count disc rides it (Annie, 9 Nov).
  expect(screen.queryByText('1')).toBeNull();
  expect(renders()).toHaveLength(0);
  expect(screen.getByText(lookbook.draft.updateModel(1))).toBeTruthy();
  await fireEvent.press(screen.getByTestId('draft-generate'));
  await waitFor(() => expect(renders()).toHaveLength(1));
  expect(screen.getByText(lookbook.draft.modelAsked)).toBeTruthy();
});

test('the adjust disc opens the AdjustSheet; her sentence redraws the picture alone (D21)', async () => {
  const draft = draftOf();
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draft,
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  await fireEvent.press(await screen.findByTestId('draft-adjust'));
  expect(await screen.findByTestId('adjust-sheet')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('adjust-sheet-field'), 'sleeves rolled up');
  await fireEvent.press(screen.getByRole('button', { name: copy.adjustSheet.send }));
  // Her note goes with the redraw; the look prompt (which could change the pieces) is never asked.
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/render'))?.body).toEqual({
      note: 'sleeves rolled up',
    }),
  );
  expect(calls.some((c) => c.path.endsWith('/ask'))).toBe(false);
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
  expect(await screen.findByTestId('styling-card')).toBeTruthy();
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

// Home's Edit opens a saved look as the Edit look sheet (3k, D18): Update look at its foot is the
// one accept; the tick only closes, once nothing waits.
test('the Edit look sheet: Update look and the tick wait for a change, × asks first', async () => {
  const jeans = piece({ id: SCARF, label: 'Straight jeans', category: 'Bottoms' });
  const saved = look({
    pieces: [
      { piece: piece(), slot: null, role: null },
      { piece: jeans, slot: null, role: null },
    ],
    model: piece().image,
    onModel: 'ready',
  });
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: saved,
    [`PATCH /looks/${LOOK_ID}`]: {
      ...saved,
      pieces: [saved.pieces[0]],
      updatedAt: new Date().toISOString(),
    },
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  const onClose = jest.fn();
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={onClose} />);
  expect(await screen.findByText(copy.editTitle)).toBeTruthy();
  const done = () => screen.getByTestId('draft-done');
  const update = () => screen.getByTestId('update-look');
  expect(done().props.accessibilityLabel).toBe(copy.doneEdit);
  // Its picture is the photo strip, on the Add a photo card (Capture PRD 3.1).
  expect(screen.getByTestId('image-manager')).toBeTruthy();
  // Nothing waits: the tick and Update look both sit dimmed (PRD 3.1); × leaves.
  expect(done().props.accessibilityState.disabled).toBe(true);
  expect(update().props.accessibilityLabel).toBe(copy.update);
  expect(update().props.accessibilityState.disabled).toBe(true);
  expect(screen.queryByTestId('draft-generate')).toBeNull();
  // A change: Update look and the tick wake, × asks Discard your changes?
  await fireEvent.press(screen.getByTestId('rack-pencil'));
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.remove('Straight jeans') }),
  );
  expect(update().props.accessibilityState.disabled).toBe(false);
  expect(done().props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(screen.getByTestId('draft-close'));
  expect(await screen.findByText(copy.discardEdit.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.discard.keep }));
  // The tick is Update look by another name: it applies the change and she stays in the sheet,
  // with both dimmed again; × then leaves without a question.
  await fireEvent.press(done());
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(await screen.findByText(lookbook.updated)).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
  await waitFor(() => expect(update().props.accessibilityState.disabled).toBe(true));
  expect(done().props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByTestId('draft-close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a saved look keeps Delete at the foot of Details, and × closes untouched without a question', async () => {
  mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
  });
  const onClose = jest.fn();
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={onClose} />);
  expect(await screen.findByText(copy.editTitle)).toBeTruthy();
  expect(screen.queryByText(copy.delete)).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: lookbook.savedLook.tabs.details }));
  expect(await screen.findByText(copy.delete)).toBeTruthy();
  // Worn opens WornView, whose "+ Add a date" opens the one diary drawer.
  await fireEvent.press(screen.getByTestId('details-worn'));
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.savedLook.wornView.add }),
  );
  expect(await screen.findByLabelText(lookbook.diary.prevMonth)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('draft-close'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(copy.discardEdit.title)).toBeNull();
});

test('a saved look opened with `schedule` has the diary up', async () => {
  mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: look(),
    'GET /plan': { days: [] },
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} presentation="saved" schedule onClose={() => undefined} />,
  );
  expect(await screen.findByLabelText(lookbook.diary.prevMonth)).toBeTruthy();
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

// Describe on Home (D22): Style it makes the day's one draft through a job. A job that ends
// without it must end the wait with a word, never leave the sheet spinning with no way on.
test('Describe: a Style it job that fails ends the wait and says so', async () => {
  const JOB = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const calls = mockFetch({
    ...BASE,
    'POST /looks/prompt': { jobId: JOB, status: 'queued' },
    [`GET /jobs/${JOB}`]: {
      id: JOB,
      kind: 'key_piece',
      status: 'failed',
      stage: 'text',
      output: {},
      error: 'timeout',
      cancelRequested: false,
      createdAt: '2026-11-06T09:00:00.000Z',
      updatedAt: '2026-11-06T09:00:05.000Z',
      finishedAt: '2026-11-06T09:00:05.000Z',
    },
  });
  await renderWithApi(
    <DraftLook id="new" day="2026-11-06" presentation="sheet" onClose={() => undefined} />,
  );
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'Dinner with friends');
  await fireEvent.press(screen.getByTestId('draft-generate'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toMatchObject({
      prompt: 'Dinner with friends',
      date: '2026-11-06',
      draft: true,
      // Shop rests off with a wardrobe (PRD rev 3 §4.6, plan R1).
      balance: 'owned',
    }),
  );
  expect(await screen.findByText(copy.styleFailed)).toBeTruthy();
  // She can ask again.
  await waitFor(() => expect(screen.getByTestId('draft-prompt').props.editable).not.toBe(false));
});

// The Rack card and the Shop toggle (Front Door PRD rev 3 §4.6, plan R1): with nothing filed the
// card offers Add your pieces and Shop rests on; with a wardrobe Shop rests off until she flips it.
test('an empty wardrobe: Add your pieces on the card, its three tiles, and Shop on', async () => {
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/summary': { total: 0, categories: [] },
    'POST /looks/prompt': { jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'queued' },
  });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  await fireEvent.press(await screen.findByRole('button', { name: copy.rackCard.add }));
  expect(await screen.findByTestId('add-pieces-sheet')).toBeTruthy();
  expect(screen.getByTestId('add-sheet-link')).toBeTruthy();
  expect(screen.getByTestId('add-sheet-photo')).toBeTruthy();
  expect(screen.getByTestId('add-sheet-receipt')).toBeTruthy();
  await waitFor(() =>
    expect(screen.getByTestId('shop-toggle').props.accessibilityState.checked).toBe(true),
  );
  await fireEvent.changeText(screen.getByTestId('draft-prompt'), 'Gallery opening');
  await fireEvent.press(screen.getByTestId('draft-generate'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
      prompt: 'Gallery opening',
      balance: 'mix',
    }),
  );
  expect(mockRouter.replace).toHaveBeenCalledWith(
    '/looks/job/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  );
});

test('with a wardrobe Shop rests off; flipped on, her words may reach for new pieces', async () => {
  const calls = mockFetch({
    ...BASE,
    'POST /looks/prompt': { jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'queued' },
  });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  const toggle = await screen.findByTestId('shop-toggle');
  await waitFor(() => expect(toggle.props.accessibilityState.checked).toBe(false));
  expect(toggle.props.accessibilityHint).toBe(copy.shop.off);
  await fireEvent.press(toggle);
  expect(screen.getByTestId('shop-toggle').props.accessibilityHint).toBe(copy.shop.on);
  await fireEvent.changeText(screen.getByTestId('draft-prompt'), 'Gallery opening');
  await fireEvent.press(screen.getByTestId('draft-generate'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
      prompt: 'Gallery opening',
      balance: 'mix',
    }),
  );
});

// The picker's WISHLIST tab (PRD rev 3 §4.6): a wish joins the rack as a piece to find, already
// hers to find, so the look carries the bag and Save files nothing twice.
test('a wish from the picker hangs on the rack as a piece to find', async () => {
  const draft = draftOf({
    pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
  });
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draft,
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...draft,
      updatedAt: new Date().toISOString(),
      ...JSON.parse(String(init.body)),
      pieces: draft.pieces,
    }),
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId('the-rack')).toBeTruthy();
  // The card under the list is the add slot.
  await fireEvent.press(screen.getByTestId('rack-card-add'));
  expect(await screen.findByTestId('piece-picker')).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: wardrobe.segments.wishlist }));
  await fireEvent.press(
    await screen.findByRole('checkbox', { name: copy.picker.pickWish('Black leather loafers') }),
  );
  expect(screen.getByText(copy.picker.cta(1))).toBeTruthy();
  await fireEvent.press(screen.getByTestId('picker-confirm'));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
      proposals: [
        {
          name: 'Black leather loafers',
          category: 'Shoes',
          brand: 'Toteme',
          retailerHint: 'toteme.com',
          pricePoint: '€390',
          wishlisted: true,
          wishlistItemId: WISH_ID,
        },
      ],
    }),
  );
  // A wish reads as a piece to find: the bag and its price at the row's right.
  expect(await screen.findByLabelText(`${lookbook.rack.wishlist} · €390`)).toBeTruthy();
});

test('The Rack heading shows once a piece hangs, and the toggle turns the rows to tiles', async () => {
  mockFetch({
    ...BASE,
    [`GET /looks/${LOOK_ID}`]: draftOf({
      pieces: [{ piece: piece(), slot: null, role: null }],
    }),
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByText(copy.rack)).toBeTruthy();
  expect(screen.getByTestId(`rack-row-${PIECE_ID}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.header.grid }));
  expect(screen.queryByTestId(`rack-row-${PIECE_ID}`)).toBeNull();
  expect(screen.getByLabelText(copy.rack)).toBeTruthy();
  expect(screen.getByText('Camel wool coat')).toBeTruthy();
});

// Add a photo to a look (Capture PRD flow 3): the Add a photo card opens the camera that only
// adds an image. A shot reads Retake, a library photo Another; Add to look stages the photograph,
// the Photos count goes up, and Update look (or the tick) keeps it. Nothing reads its pieces.
test('add a photo to a look: camera, Retake or Another, Add to look, then Update look', async () => {
  const saved = look({ model: piece().image, onModel: 'ready' });
  const withPhoto = {
    ...saved,
    images: [{ id: SCARF, image: { ...piece().image, assetId: ASSET_ID }, position: 0 }],
    updatedAt: new Date().toISOString(),
  };
  const calls = mockFetch({
    ...BASE,
    ...UPLOAD,
    [`GET /looks/${LOOK_ID}`]: saved,
    [`POST /looks/${LOOK_ID}/images`]: withPhoto,
    [`POST /looks/${LOOK_ID}/images/cover`]: withPhoto,
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId('image-manager')).toBeTruthy();
  const done = () => screen.getByTestId('draft-done');
  const update = () => screen.getByTestId('update-look');
  expect(update().props.accessibilityState.disabled).toBe(true);
  expect(done().props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByText(lookbook.savedLook.tabs.details));
  expect(screen.getByTestId('details-photos')).toHaveTextContent(/1/);

  await fireEvent.press(screen.getByTestId('image-card-add'));
  expect(await screen.findByText(cam.hint)).toBeTruthy();
  expect(cam.hint).toBe('Wearing this look? Step back · Head to toe');
  // A shot reads Retake, which returns to the viewfinder.
  await fireEvent.press(screen.getByRole('button', { name: cam.shutter }));
  await fireEvent.press(await screen.findByRole('button', { name: cam.retake }));
  expect(await screen.findByText(cam.hint)).toBeTruthy();
  // A library photo reads Another, and reopens her photos.
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/library.jpg', mimeType: 'image/jpeg', width: 900, height: 1200 }],
  });
  await fireEvent.press(screen.getByRole('button', { name: cam.photos }));
  await fireEvent.press(await screen.findByRole('button', { name: cam.another }));
  await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(2));

  // Add to look: the card joins the strip, the count goes up, Update look and the tick turn on.
  await fireEvent.press(screen.getByRole('button', { name: cam.use }));
  expect(await screen.findByTestId('image-card-added')).toBeTruthy();
  expect(screen.queryByTestId('capture-review')).toBeNull();
  expect(screen.getByTestId('details-photos')).toHaveTextContent(/2/);
  expect(update().props.accessibilityState.disabled).toBe(false);
  expect(done().props.accessibilityState.disabled).toBe(false);
  // Nothing is written until Update look.
  expect(calls.some((c) => c.path.endsWith(`/looks/${LOOK_ID}/images`))).toBe(false);
  await fireEvent.press(update());
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith(`/looks/${LOOK_ID}/images`))?.body).toEqual({
      assetId: ASSET_ID,
    }),
  );
  expect(await screen.findByText(lookbook.updated)).toBeTruthy();
  expect(lookbook.updated).toBe('Look updated.');
  // Adding a photograph never reads its pieces.
  expect(calls.some((c) => /photo-reads|pieces\/find/.test(c.path))).toBe(false);
});
