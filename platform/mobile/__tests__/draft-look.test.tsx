import { diary, lookbook, ui, wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { DraftLook } from '../src/features/looks/DraftLook';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { openPrompt } from './support/prompt';
import { mockNavigation, mockRouter } from './support/router';

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

const MADE_JOB = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
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
    [`POST /looks/${LOOK_ID}/render`]: { jobId: MADE_JOB, status: 'queued' },
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
  // Photograph one leads the grid once her pieces have loaded: wait for it, as for the pieces
  // (it raced the load under a busy test run).
  expect(await screen.findByRole('button', { name: diary.flyout.photograph })).toBeTruthy();
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
  // The draft carries on in the same sheet: its rack under its heading, the model dressed in it
  // at once and the prompt closed to its sparkle (Annie, 16 Nov).
  expect(await screen.findByTestId('the-rack')).toBeTruthy();
  expect(await screen.findByTestId('prompt-spark')).toBeTruthy();
  await waitFor(
    () => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/render'))).toBe(true),
    { timeout: 3000 },
  );
  expect(onClose).not.toHaveBeenCalled();
});

// Annie and Felix, 12 Nov: the draft sheet's prompt box sat under the foot and would not scroll.
// The native sheet stretched the body's ScrollView over the whole sheet once it could reach it
// through views flattened away; the sheet's frame and the body's view stay views of their own.
test('the draft sheet keeps its ScrollView between its head and its foot', async () => {
  mockFetch({ ...BASE, 'GET /wardrobe/items': { items: [piece()], nextCursor: null } });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId('prompt-send')).toBeTruthy();
  const shell = screen.getByTestId('draft-shell');
  expect(shell.props.collapsable).toBe(false);
  const body = screen.getByTestId('draft-look').parent;
  expect(body?.props.collapsable).toBe(false);
  expect(body?.parent).toBe(shell);
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

// A draft's model wears the rack as she builds it (Annie, 16 Nov): a swap by hand dresses it at
// once, with no button to press and nothing said in the conversation.
test('a swap from the picker dresses the model at once', async () => {
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
  // Dressed again for the new rack, with no button and no line in the conversation.
  await waitFor(() => expect(renders()).toHaveLength(1), { timeout: 3000 });
  expect(screen.queryByTestId('update-model')).toBeNull();
  expect(screen.queryByText(lookbook.draft.modelAsked)).toBeNull();
});

// Dressing is never retried on its own: a picture that failed says so and waits for her.
test('a draft whose picture failed is not dressed again by itself', async () => {
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draftOf({ onModel: 'failed' }),
    [`POST /looks/${LOOK_ID}/render`]: { jobId: MADE_JOB, status: 'queued' },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId('the-rack')).toBeTruthy();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1500));
  });
  expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/render'))).toBe(false);
});

// The photo carries no styling control (docked prompt PRD M1): a note about the picture goes
// through the prompt (look-page.test: a note about the picture redraws the model).
test('the draft photo carries no Adjust model image', async () => {
  mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draftOf(),
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId('the-rack')).toBeTruthy();
  expect(screen.queryByTestId('draft-adjust')).toBeNull();
});

// Restyle it all is how a look Robes made is dressed again (look prompt PRD F12, F13; decision 12
// retired Dress it again and the DescribeSheet): opened, the draft is asked about, and after a
// thumbs down the chip stands alone, her words its note.
test('a draft Robes made is asked about; Restyle it all re-writes it from her words', async () => {
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
  const fb = copy.feedback;
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByText(fb.question)).toBeTruthy();
  expect(screen.queryByRole('button', { name: lookbook.draft.redress })).toBeNull();
  await fireEvent.press(screen.getByTestId('thumb-down'));
  // Picking a reason first, then Restyle it all: it stands alone (F8).
  await fireEvent.press(screen.getByTestId('reason-dressy'));
  await fireEvent.press(screen.getByTestId('reason-restyle'));
  expect(screen.getByTestId('reason-restyle').props.accessibilityState.selected).toBe(true);
  expect(screen.queryByTestId('reason-dressy')).toBeNull();
  await fireEvent.changeText(await openPrompt(), 'more casual');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/restyle'))?.body).toEqual({ note: 'more casual' }),
  );
  expect(calls.some((c) => c.path.endsWith('/ask'))).toBe(false);
  // The send keeps the sheet open on the conversation (B6, 16 Nov): her choice, then the work in
  // hand.
  expect(screen.getByTestId('draft-prompt')).toBeTruthy();
  expect(await screen.findByText(`${fb.restyle.label} · “more casual”`)).toBeTruthy();
  expect(screen.getByText(fb.restyle.work(''))).toBeTruthy();
});

// On iOS's own sheet (phase 3) the close puts the bar away first, then asks: iOS presents
// nothing over a sheet still on screen (Annie, 18 Nov: ✕ did nothing with the bar up).
test('with iOS’s sheet up, closing puts the bar away and then asks', async () => {
  process.env.ROBES_DRAWN_DOCK = '0';
  try {
    mockFetch({
      ...BASE,
      'GET /wardrobe/items': { items: [piece()], nextCursor: null },
      [`GET /looks/${LOOK_ID}`]: draftOf(),
    });
    await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
    expect(await screen.findByTestId('the-rack')).toBeTruthy();
    if (!screen.queryByTestId('prompt-dock')) {
      await fireEvent.press(screen.getByTestId('prompt-spark'));
    }
    expect(await screen.findByTestId('prompt-dock')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('draft-close'));
    await waitFor(() => expect(screen.queryByTestId('prompt-dock')).toBeNull());
    expect(await screen.findByText(copy.discard.title)).toBeTruthy();
    expect(screen.getByTestId('prompt-spark')).toBeTruthy();
  } finally {
    process.env.ROBES_DRAWN_DOCK = '1';
  }
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
  expect(await screen.findByTestId('the-rack')).toBeTruthy();
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
  const update = () => screen.getByTestId('update-look');
  // One confirm per screen (audit P1): Update look is the accept; the header has no ✓.
  expect(screen.queryByTestId('draft-done')).toBeNull();
  // Its picture is the photo strip, on the Add a photo card (Capture PRD 3.1).
  expect(screen.getByTestId('image-manager')).toBeTruthy();
  // Nothing waits: Update look sits dimmed (PRD 3.1); × leaves.
  expect(update().props.accessibilityLabel).toBe(copy.update);
  expect(update().props.accessibilityState.disabled).toBe(true);
  expect(screen.queryByTestId('update-model')).toBeNull();
  // A change: Update look and the tick wake, × asks Discard your changes?
  await fireEvent.press(screen.getByTestId('rack-pencil'));
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.remove('Straight jeans') }),
  );
  expect(update().props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(screen.getByTestId('draft-close'));
  expect(await screen.findByText(copy.discardEdit.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.discard.keep }));
  // Update look applies the change and she stays in the sheet, dimmed again; × then leaves
  // without a question.
  await fireEvent.press(update());
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(await screen.findByText(lookbook.updated)).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
  await waitFor(() => expect(update().props.accessibilityState.disabled).toBe(true));
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

// Annie, 12 Nov: a look built from pieces and saved left her on its page with Back and Schedule
// look dead. The diary rose while the page was still coming in under the sheet going out, and iOS
// left a see-through layer over the app. Now the sheet goes at once, and the diary waits.
test('a draft saved from its sheet leaves it at once for its page, with the diary asked for', async () => {
  const calls = mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: draftOf({
      pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    }),
    [`POST /looks/${LOOK_ID}/save`]: look({ status: 'saved' }),
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  // The title stands over the loading skeleton too: wait for the tick to wake.
  await waitFor(() =>
    expect(screen.getByTestId('draft-done').props.accessibilityState.disabled).toBe(false),
  );
  await fireEvent.press(screen.getByTestId('draft-done'));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}?schedule=1`),
  );
  expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/save'))).toBe(true);
  // The sheet's slide down is switched off before the replace that removes it.
  expect(mockNavigation.setOptions).toHaveBeenCalledWith({ animation: 'none' });
  expect(mockNavigation.setOptions.mock.invocationCallOrder[0]).toBeLessThan(
    mockRouter.replace.mock.invocationCallOrder[0] ?? 0,
  );
});

test('the diary asked for on arrival waits for the page to finish coming in', async () => {
  mockFetch({
    ...BASE,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: look(),
    'GET /plan': { days: [] },
  });
  let arrive: ((e: { data: { closing: boolean } }) => void) | null = null;
  mockNavigation.addListener.mockImplementationOnce((type, listener) => {
    if (type === 'transitionEnd') arrive = listener;
    return () => {};
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} presentation="saved" schedule onClose={() => undefined} />,
  );
  expect(await screen.findByTestId('schedule-look')).toBeTruthy();
  expect(screen.queryByLabelText(lookbook.diary.prevMonth)).toBeNull();
  // The sheet it came from finishing its exit is not this page arriving.
  await act(async () => arrive?.({ data: { closing: true } }));
  expect(screen.queryByLabelText(lookbook.diary.prevMonth)).toBeNull();
  await act(async () => arrive?.({ data: { closing: false } }));
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
  await fireEvent.changeText(await openPrompt(), 'Dinner with friends');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toMatchObject({
      prompt: 'Dinner with friends',
      date: '2026-11-06',
      draft: true,
      // Her wardrobe alone at rest once she has one (look prompt PRD S2).
      balance: 'owned',
    }),
  );
  expect(await screen.findByText(copy.styleFailed)).toBeTruthy();
  // She can ask again: the drawer is still open, her words back in its box (16 Nov).
  await waitFor(() =>
    expect(screen.getByTestId('draft-prompt').props.value).toBe('Dinner with friends'),
  );
  expect(screen.queryByTestId('her-line')).toBeNull();
  expect(screen.getByTestId('draft-prompt').props.editable).not.toBe(false);
});

// Before her first send the prompt opens on the box she tapped, its place and weather standing,
// with no tracked title over it (Prompt states; look prompt improvements B1, 16 Nov).
const DAY = '2026-11-06';
// A whole Today (it must parse), with the day's place and weather in its diary.
const TODAY_WITH_WEATHER = {
  date: DAY,
  hour: 9,
  firstName: null,
  today: [],
  week: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${String(i + 6).padStart(2, '0')}`,
    looks: 0,
    first: null,
  })),
  tray: [],
  ideas: [],
  inboxCount: 0,
  overnight: null,
  home: {
    state: { styleConfirmed: true, twinOnFile: true, pics: 6, ownLookSaved: true, snoozed: {} },
    rows: { brands: [], icons: [], styles: [] },
    recent: [],
    candidates: [],
    receipts: null,
    noticed: null,
    saved: [],
    suggested: [],
  },
  diary: {
    from: DAY,
    to: DAY,
    days: [
      {
        date: DAY,
        name: null,
        place: null,
        weather: { city: 'Dublin', tempRange: '9–14°C', condition: 'light rain', code: 61 },
        draft: null,
        entries: [],
      },
    ],
  },
};
const dock = () => within(screen.getByTestId('prompt-dock'));

test('a new look for a day: typing keeps the place and weather, under no title', async () => {
  mockFetch({ ...BASE, 'GET /today': TODAY_WITH_WEATHER });
  await renderWithApi(
    <DraftLook id="new" day={DAY} presentation="sheet" onClose={() => undefined} />,
  );
  expect(await screen.findByText('Dublin')).toBeTruthy();
  await fireEvent.changeText(await openPrompt(), 'Dinner with friends');
  expect(dock().getByText('Dublin')).toBeTruthy();
  expect(dock().queryByText(copy.dock.title)).toBeNull();
  // Bare: no panel's grab bar over the box either.
  expect(dock().queryByLabelText(ui.close)).toBeNull();
  // A tap beside the box still closes it, though no shade shows (iOS gives a faded view no touch).
  await fireEvent.press(
    screen.getByTestId('prompt-dock-backdrop', { includeHiddenElements: true }),
  );
  await waitFor(() => expect(screen.queryByTestId('draft-prompt')).toBeNull());
  await openPrompt();
  // × still leaves the weather out while she types, and offers it back.
  await fireEvent.press(dock().getByLabelText(diary.door.weatherOut));
  expect(await dock().findByTestId('weather-chip')).toBeTruthy();
});

test('a draft for a day with no conversation yet: its sparkle opens the box, place and weather and all', async () => {
  mockFetch({
    ...BASE,
    'GET /today': TODAY_WITH_WEATHER,
    [`GET /looks/${LOOK_ID}`]: draftOf({
      pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    }),
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={() => undefined} />,
  );
  // With pieces on its rack it rests as the sparkle (Annie, 16 Nov).
  expect(await screen.findByTestId('prompt-spark')).toBeTruthy();
  await fireEvent.changeText(await openPrompt(), 'warmer');
  expect(await dock().findByText('Dublin')).toBeTruthy();
  expect(dock().queryByText(copy.dock.title)).toBeNull();
});

// Once she sends, the place and weather her words went with stand under her first line, on every
// draft for a day; left out on New look, they stay out of the draft it makes (B3, B4, 16 Nov).
const ASK_JOB = '99999999-9999-4999-8999-999999999999';

test('a hand-built draft for a day: her first line carries the place and weather', async () => {
  const calls = mockFetch({
    ...BASE,
    'GET /today': TODAY_WITH_WEATHER,
    [`GET /looks/${LOOK_ID}`]: draftOf({
      pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    }),
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={() => undefined} />,
  );
  await fireEvent.changeText(await openPrompt(), 'warmer');
  await dock().findByText('Dublin');
  await fireEvent.press(dock().getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/ask'))?.body).toMatchObject({
      context: { weather: expect.stringContaining('Dublin') },
    }),
  );
  await openPrompt();
  expect(await screen.findByTestId('her-meta')).toBeTruthy();
});

test('the weather left out on New look stays out of the draft it makes', async () => {
  const calls = mockFetch({
    ...BASE,
    'GET /today': TODAY_WITH_WEATHER,
    'POST /looks/prompt': { jobId: MADE_JOB, status: 'queued' },
    [`GET /jobs/${MADE_JOB}`]: {
      id: MADE_JOB,
      kind: 'key_piece',
      status: 'succeeded',
      stage: 'done',
      output: { lookIds: [LOOK_ID], occasion: 'dinner' },
      error: null,
      cancelRequested: false,
      createdAt: '2026-11-06T09:00:00.000Z',
      updatedAt: '2026-11-06T09:00:05.000Z',
      finishedAt: '2026-11-06T09:00:05.000Z',
    },
    [`GET /looks/${LOOK_ID}`]: draftOf({
      pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    }),
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
  });
  await renderWithApi(
    <DraftLook id="new" day={DAY} presentation="sheet" onClose={() => undefined} />,
  );
  await fireEvent.changeText(await openPrompt(), 'Dinner with friends');
  await fireEvent.press(dock().getByLabelText(diary.door.weatherOut));
  await fireEvent.press(dock().getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toMatchObject({
      weather: false,
    }),
  );
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ id: LOOK_ID }));
  // Robes' question waits on the sparkle's dot (Annie, 18 Nov); a tap opens the bar on it.
  await fireEvent.press(
    await screen
      .findByTestId('prompt-spark-dot', { includeHiddenElements: true })
      .then(() => screen.getByTestId('prompt-spark')),
  );
  await screen.findByText(copy.feedback.questionFor('dinner'));
  // No place or weather under her brief, and none sent with her next words.
  await openPrompt();
  expect(screen.queryByTestId('her-meta')).toBeNull();
  await fireEvent.changeText(screen.getByTestId('draft-prompt'), 'warmer');
  await fireEvent.press(dock().getByTestId('prompt-send'));
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/ask'))).toBe(true));
  expect(calls.find((c) => c.path.endsWith('/ask'))?.body).not.toHaveProperty('context');
});

// The Rack card and the two sources (look prompt PRD S1–S5): with nothing filed the card offers
// Add your pieces, Wardrobe is faded and Shop is the one source; with a wardrobe it is the other
// way round until she says otherwise.
test('an empty wardrobe: Add your pieces on the card, Shop the one source, new pieces only', async () => {
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
    expect(screen.getByTestId('source-shop').props.accessibilityState.checked).toBe(true),
  );
  const wardrobe = screen.getByTestId('source-wardrobe');
  expect(wardrobe.props.accessibilityState.checked).toBe(false);
  expect(wardrobe.props.accessibilityLabel).toBe(copy.sources.wardrobe.empty);
  // One source is always on (S4): Shop cannot be turned off while it is the only one.
  await fireEvent.press(screen.getByTestId('source-shop'));
  expect(screen.getByTestId('source-shop').props.accessibilityState.checked).toBe(true);
  await fireEvent.changeText(await openPrompt(), 'Gallery opening');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
      prompt: 'Gallery opening',
      draft: true,
      balance: 'new',
    }),
  );
  // Her words never deal three looks to the deck (look prompt PRD D6, D9).
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('a tap on Wardrobe while it is empty says so and offers the way in', async () => {
  mockFetch({ ...BASE, 'GET /wardrobe/summary': { total: 0, categories: [] } });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  await waitFor(() =>
    expect(screen.getByTestId('source-wardrobe').props.accessibilityLabel).toBe(
      copy.sources.wardrobe.empty,
    ),
  );
  await fireEvent.press(screen.getByTestId('source-wardrobe'));
  expect(await screen.findByText(copy.emptyWardrobe.title)).toBeTruthy();
  expect(screen.getByTestId('source-wardrobe').props.accessibilityState.checked).toBe(false);
  // The alert says why (docked prompt PRD W2); Add pieces opens the sheet once it has gone.
  expect(screen.getByText(copy.emptyWardrobe.body)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.emptyWardrobe.add }));
  expect(await screen.findByTestId('add-pieces-sheet')).toBeTruthy();
});

test('Wardrobe tapped in the open prompt while it is empty: the prompt comes back after (B7)', async () => {
  mockFetch({ ...BASE, 'GET /wardrobe/summary': { total: 0, categories: [] } });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  await fireEvent.changeText(await openPrompt(), 'Gallery opening');
  await waitFor(() =>
    expect(dock().getByTestId('source-wardrobe').props.accessibilityLabel).toBe(
      copy.sources.wardrobe.empty,
    ),
  );
  await fireEvent.press(dock().getByTestId('source-wardrobe'));
  expect(await screen.findByText(copy.emptyWardrobe.title)).toBeTruthy();
  await waitFor(() => expect(screen.queryByTestId('draft-prompt')).toBeNull());
  // Not now: once the alert has gone, the prompt is open again, her words still in it.
  await fireEvent.press(screen.getByRole('button', { name: copy.emptyWardrobe.notNow }));
  await waitFor(() =>
    expect(screen.getByTestId('draft-prompt').props.value).toBe('Gallery opening'),
  );
});

test('with a wardrobe it is the one source; Shop beside it is a mix, Shop alone is new', async () => {
  const calls = mockFetch({
    ...BASE,
    'POST /looks/prompt': { jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'queued' },
  });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  const shop = await screen.findByTestId('source-shop');
  await waitFor(() => expect(shop.props.accessibilityState.checked).toBe(false));
  expect(shop.props.accessibilityLabel).toBe(copy.sources.shop.off);
  expect(screen.getByTestId('source-wardrobe').props.accessibilityLabel).toBe(
    copy.sources.wardrobe.on,
  );
  await fireEvent.press(shop);
  expect(screen.getByTestId('source-shop').props.accessibilityLabel).toBe(copy.sources.shop.on);
  await fireEvent.changeText(await openPrompt(), 'Gallery opening');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
      prompt: 'Gallery opening',
      draft: true,
      balance: 'mix',
    }),
  );
});

// One draft for every prompt, with or without a day (look prompt PRD D6, D9, F1, F3): the job's
// look opens in the same sheet, her words head its thread, and Robes asks about the occasion.
// The sparkle send on an empty box sends nothing and folds the prompt to the sparkle; the sparkle
// brings the box back (docked prompt K6, Annie 18 Nov).
test('New look: an empty send folds the box to the sparkle, which brings it back', async () => {
  mockFetch(BASE);
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  await openPrompt();
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() => expect(screen.queryByTestId('draft-prompt')).toBeNull());
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  expect(screen.getByTestId('prompt-rest')).toBeTruthy();
});

test('her words with no day make one draft in the same sheet, and Robes asks about the occasion', async () => {
  const made = draftOf({
    pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
  });
  const calls = mockFetch({
    ...BASE,
    'POST /looks/prompt': { jobId: MADE_JOB, status: 'queued' },
    [`GET /jobs/${MADE_JOB}`]: {
      id: MADE_JOB,
      kind: 'key_piece',
      status: 'succeeded',
      stage: 'done',
      output: { lookIds: [LOOK_ID], occasion: 'brunch' },
      error: null,
      cancelRequested: false,
      createdAt: '2026-11-06T09:00:00.000Z',
      updatedAt: '2026-11-06T09:00:05.000Z',
      finishedAt: '2026-11-06T09:00:05.000Z',
    },
    [`GET /looks/${LOOK_ID}`]: made,
  });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  await fireEvent.changeText(await openPrompt(), 'relaxed weekend brunch');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  // Sent, the dock waits as the sparkle while Robes dresses the look, not an open box over it
  // (Annie, 18 Nov).
  expect(await screen.findByTestId('prompt-spark')).toBeTruthy();
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
      prompt: 'relaxed weekend brunch',
      draft: true,
      balance: 'owned',
    }),
  );
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ id: LOOK_ID }));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  const fb = copy.feedback;
  // The drawer carries on into the draft; Robes' question waits on the sparkle's dot, and a tap
  // opens the bar on it (docked prompt K3, K7); her brief heads the thread its grabber opens (K8).
  expect(
    await screen.findByTestId('prompt-spark-dot', { includeHiddenElements: true }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  expect(await screen.findByText(fb.questionFor('brunch'))).toBeTruthy();
  expect(screen.getByTestId('prompt-bar')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-expand'));
  expect(screen.getByText('relaxed weekend brunch')).toBeTruthy();
  // The question is open: two thumbs, and the box offers to take a change instead.
  expect(screen.getByTestId('thumb-up').props.accessibilityState.disabled).toBe(false);
  expect(screen.getByLabelText(fb.placeholder)).toBeTruthy();
});

test('with no occasion in her brief, Robes asks the plain question', async () => {
  mockFetch({
    ...BASE,
    'POST /looks/prompt': { jobId: MADE_JOB, status: 'queued' },
    [`GET /jobs/${MADE_JOB}`]: {
      id: MADE_JOB,
      kind: 'key_piece',
      status: 'succeeded',
      stage: 'done',
      output: { lookIds: [LOOK_ID] },
      error: null,
      cancelRequested: false,
      createdAt: '2026-11-06T09:00:00.000Z',
      updatedAt: '2026-11-06T09:00:05.000Z',
      finishedAt: '2026-11-06T09:00:05.000Z',
    },
    [`GET /looks/${LOOK_ID}`]: draftOf({
      pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    }),
  });
  await renderWithApi(
    <DraftLook id="new" day="2026-11-06" presentation="sheet" onClose={() => undefined} />,
  );
  await fireEvent.changeText(await openPrompt(), 'something easy');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  // Robes' question waits on the sparkle's dot (Annie, 18 Nov); a tap opens the bar on it.
  await fireEvent.press(
    await screen
      .findByTestId('prompt-spark-dot', { includeHiddenElements: true })
      .then(() => screen.getByTestId('prompt-spark')),
  );
  expect(await screen.findByText(copy.feedback.question)).toBeTruthy();
});

test('while the draft her words made is still being dressed, Robes works and asks only after', async () => {
  const JOB_DONE = {
    id: MADE_JOB,
    kind: 'key_piece',
    status: 'succeeded',
    stage: 'done',
    output: { lookIds: [LOOK_ID], occasion: 'dinner' },
    error: null,
    cancelRequested: false,
    createdAt: '2026-11-06T09:00:00.000Z',
    updatedAt: '2026-11-06T09:00:05.000Z',
    finishedAt: '2026-11-06T09:00:05.000Z',
  };
  const pieces = [{ piece: piece({ category: 'Tops' }), slot: null, role: null }];
  const routes = {
    ...BASE,
    'POST /looks/prompt': { jobId: MADE_JOB, status: 'queued' },
    [`GET /jobs/${MADE_JOB}`]: JOB_DONE,
    [`GET /looks/${LOOK_ID}`]: draftOf({ pieces, onModel: 'pending' }),
  };
  mockFetch(routes);
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  await fireEvent.changeText(await openPrompt(), 'dinner with friends');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ id: LOOK_ID }));
  // The model is still being dressed: the dock waits as the sparkle, with no dot, rather than an
  // open box over "Dressing it…" (Annie, 18 Nov); no question, no thumbs.
  expect(await screen.findByTestId('prompt-spark')).toBeTruthy();
  expect(screen.queryByTestId('prompt-spark-dot', { includeHiddenElements: true })).toBeNull();
  expect(screen.queryByText(copy.feedback.questionFor('dinner'))).toBeNull();
  expect(screen.queryByTestId('thumb-up')).toBeNull();
  // The picture lands: Robes asks, and the sparkle's dot says so; a tap opens the bar on it.
  mockFetch({ ...routes, [`GET /looks/${LOOK_ID}`]: draftOf({ pieces, onModel: 'ready' }) });
  expect(
    await screen.findByTestId(
      'prompt-spark-dot',
      { includeHiddenElements: true },
      { timeout: 6000 },
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  expect(await screen.findByText(copy.feedback.questionFor('dinner'))).toBeTruthy();
  expect(screen.getByTestId('thumb-up')).toBeTruthy();
  expect(screen.queryByText(lookbook.draft.dressing)).toBeNull();
}, 15_000);

test('turning Wardrobe off, the only source, turns Shop on: new pieces only', async () => {
  const calls = mockFetch({
    ...BASE,
    'POST /looks/prompt': { jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'queued' },
  });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  const wardrobe = await screen.findByTestId('source-wardrobe');
  await waitFor(() => expect(wardrobe.props.accessibilityState.checked).toBe(true));
  await fireEvent.press(wardrobe);
  expect(screen.getByTestId('source-wardrobe').props.accessibilityState.checked).toBe(false);
  expect(screen.getByTestId('source-shop').props.accessibilityState.checked).toBe(true);
  await fireEvent.changeText(await openPrompt(), 'Gallery opening');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
      prompt: 'Gallery opening',
      draft: true,
      balance: 'new',
    }),
  );
});

// The send inside the box (look prompt PRD P2–P4, D5).
test('an empty send sends nothing; past 300 characters the box says so and will not send', async () => {
  const calls = mockFetch({
    ...BASE,
    'POST /looks/prompt': { jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'queued' },
  });
  await renderWithApi(<DraftLook id="new" presentation="sheet" onClose={() => undefined} />);
  const send = await screen.findByTestId('prompt-send');
  // A draft's send stands ready on an empty field, and pressed empty it sends nothing.
  expect(send.props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(send);
  expect(calls.some((c) => c.path.endsWith('/looks/prompt'))).toBe(false);
  await fireEvent.changeText(await openPrompt(), 'a'.repeat(301));
  expect(await screen.findByText(copy.tooLong(300))).toBeTruthy();
  expect(screen.getByTestId('prompt-send').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(calls.some((c) => c.path.endsWith('/looks/prompt'))).toBe(false);
  // Her words are never cut: back under the limit, the same field sends.
  await fireEvent.changeText(await openPrompt(), 'a'.repeat(300));
  expect(screen.queryByText(copy.tooLong(300))).toBeNull();
  expect(screen.getByTestId('prompt-send').props.accessibilityState.disabled).toBe(false);
});

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
  // With a piece on the rack, the add slot is the small + hanger chip, not the big card (Annie,
  // 15 Nov); the card is only for an empty rack.
  expect(screen.queryByTestId('rack-card-add')).toBeNull();
  // The + opens the picker once her wardrobe's count is in (before it, Add pieces): wait for it.
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/wardrobe/summary'))).toBe(true));
  await act(async () => {
    await new Promise((done) => setTimeout(done, 50));
  });
  await fireEvent.press(screen.getByTestId('rack-add'));
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
  // It is the wish itself: tapped, it opens the wish's page (Annie, 15 Nov: it couldn't be opened).
  mockRouter.push.mockClear();
  await fireEvent.press(screen.getByRole('button', { name: /Black leather loafers/ }));
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/wish/[id]', params: { id: WISH_ID } });
});

// The Rack's controls sit on the Pieces · Details line, with no heading of its own (Annie, 16 Nov).
test('once a piece hangs, the toggle on the tabs line turns the rows to small photos', async () => {
  mockFetch({
    ...BASE,
    [`GET /looks/${LOOK_ID}`]: draftOf({
      pieces: [{ piece: piece(), slot: null, role: null }],
    }),
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId(`rack-row-${PIECE_ID}`)).toBeTruthy();
  const tabs = within(screen.getByTestId('draft-tabs'));
  expect(tabs.getByTestId('rack-pencil')).toBeTruthy();
  expect(screen.queryByRole('header', { name: copy.rack })).toBeNull();
  await fireEvent.press(tabs.getByRole('radio', { name: wardrobe.header.grid }));
  expect(screen.queryByTestId(`rack-row-${PIECE_ID}`)).toBeNull();
  expect(screen.getByLabelText(copy.rack)).toBeTruthy();
  // The grid is the pieces' photographs alone, five across (Robes MVP; Annie, 15 Nov): the name is
  // what a reader hears, not a line beneath.
  expect(screen.getAllByTestId('rack-grid-tile')).toHaveLength(1);
  expect(screen.getByLabelText('Camel wool coat')).toBeTruthy();
  expect(screen.queryByText('Camel wool coat')).toBeNull();
  // The pencil puts the tiles in edit mode (Robes MVP 2b): × on the corner, swap at the foot.
  await fireEvent.press(screen.getByTestId('rack-pencil'));
  expect(
    screen.getByRole('button', { name: lookbook.rack.remove('Camel wool coat') }),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.rack.swap('Camel wool coat') })).toBeTruthy();
});

// A look Robes made from her words opens on its pieces' photographs (Annie, 16 Nov).
test('a draft Robes made opens its rack on the photographs', async () => {
  mockFetch({
    ...BASE,
    [`GET /looks/${LOOK_ID}`]: draftOf({ composedByRobes: true, source: 'generated' }),
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  expect(await screen.findByTestId('rack-grid-tile')).toBeTruthy();
  expect(screen.queryByTestId(`rack-row-${PIECE_ID}`)).toBeNull();
});

// Add a photo to a look (Capture PRD flow 3): the Add a photo card opens the camera that only
// adds an image. A shot reads Retake, a library photo Another; Add to look stages the photograph,
// the Photos count goes up, and the strip's ✓ keeps it as the cover there and then — it is never a
// change waiting for Update look (Annie, 11 Nov). Nothing reads its pieces.
test('add a photo to a look: camera, Retake or Another, Add to look, then the strip’s ✓ keeps it', async () => {
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
  const update = () => screen.getByTestId('update-look');
  expect(update().props.accessibilityState.disabled).toBe(true);
  expect(screen.queryByTestId('draft-done')).toBeNull();
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

  // Add to look: the card joins the strip in focus and the count goes up; Update look and the
  // tick stay off.
  await fireEvent.press(screen.getByRole('button', { name: cam.use }));
  expect(await screen.findByTestId('image-card-added')).toBeTruthy();
  expect(screen.queryByTestId('capture-review')).toBeNull();
  expect(screen.getByTestId('details-photos')).toHaveTextContent(/2/);
  expect(update().props.accessibilityState.disabled).toBe(true);
  // Nothing is written before the strip's ✓; the ✓ keeps the photograph and makes it the cover.
  expect(calls.some((c) => c.path.endsWith(`/looks/${LOOK_ID}/images`))).toBe(false);
  await fireEvent.press(screen.getByTestId('image-manager-done'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith(`/looks/${LOOK_ID}/images`))?.body).toEqual({
      assetId: ASSET_ID,
    }),
  );
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/images/cover'))?.body).toEqual({ imageId: SCARF }),
  );
  await waitFor(() => expect(screen.queryByTestId('image-manager')).toBeNull());
  expect(update().props.accessibilityState.disabled).toBe(true);
  // Adding a photograph never reads its pieces.
  expect(calls.some((c) => /photo-reads|pieces\/find/.test(c.path))).toBe(false);
});
