import { lookbook, looks, ui, wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { DraftPage, NewDraft } from '../src/features/looks/DraftPage';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/me.jpg', width: 900, height: 1200, mimeType: 'image/jpeg' }],
  })),
}));
jest.mock('../src/features/wardrobe/add-pieces', () => ({
  ...jest.requireActual('../src/features/wardrobe/add-pieces'),
  uploadPhoto: jest.fn(async () => '44444444-4444-4444-8444-444444444444'),
}));

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

beforeEach(() => jest.clearAllMocks());

test('a new look is a draft from its first piece, named when she names it, then it opens', async () => {
  const calls = mockFetch({
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Silk scarf', category: 'Accessories' })],
      nextCursor: null,
    },
    'POST /looks': look({ status: 'draft' }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<NewDraft />);
  expect(await screen.findByText(lookbook.mix(0, 0))).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(lookbook.name.label), 'Gallery');
  await fireEvent.press(screen.getByRole('button', { name: lookbook.rack.addPiece }));
  await fireEvent.press(await screen.findByRole('radio', { name: 'Silk scarf' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    status: 'draft',
    pieces: [{ pieceId: SCARF }],
    name: 'Gallery',
  });
});

test('a sixth draft asks to let the oldest go, and only then makes room', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let posts = 0;
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'POST /looks': () => {
      posts += 1;
      return posts === 1
        ? errorReply(409, 'conflict', { reason: 'drafts_full' })
        : look({ status: 'draft' });
    },
    'GET /looks': { items: [look({ name: 'Oldest draft', status: 'draft' })], nextCursor: null },
  });
  await renderWithApi(<NewDraft pieceId={PIECE_ID} />);
  await waitFor(() => expect(alert).toHaveBeenCalled());
  const [title, body, buttons] = alert.mock.calls[0] as [
    string,
    string,
    { text: string; onPress?: () => void }[],
  ];
  expect(title).toBe(lookbook.drafts.fullTitle);
  expect(body).toBe(lookbook.drafts.fullBody('Oldest draft'));
  buttons.find((b) => b.text === lookbook.drafts.letGo)?.onPress?.();
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
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

test('the empty draft stands her model on the mat with Discard and a held Save at the foot', async () => {
  mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /looks': { items: [], nextCursor: null },
    'GET /me/model': MODEL,
  });
  await renderWithApi(<NewDraft />);
  expect(await screen.findByText(lookbook.draft.eyebrow)).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.bar.discard })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: lookbook.bar.save }).props.accessibilityState.disabled,
  ).toBe(true);
  // The dashed row opens the one wardrobe sheet: Photograph one leads the grid, with a search.
  await fireEvent.press(screen.getByRole('button', { name: lookbook.rack.addPiece }));
  expect(await screen.findByText(lookbook.sheet.eyebrow)).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.sheet.photograph })).toBeTruthy();
  expect(screen.getByLabelText(lookbook.sheet.search)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(lookbook.sheet.search), 'camel');
  expect(await screen.findByRole('radio', { name: 'Camel wool coat' })).toBeTruthy();
});

// The one draft page (design 3b, plan 2026-11-03 D3): the picture is drawn only when she asks.
test('a draft reads its text block; a swap leaves the picture behind until Update the model', async () => {
  const draft = look({
    status: 'draft',
    pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
    model: piece().image,
    onModel: 'ready',
  });
  const calls = mockFetch({
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Navy silk top', category: 'Tops' })],
      nextCursor: null,
    },
    'GET /looks': { items: [], nextCursor: null },
    'GET /me/model': MODEL,
    'POST /me/memory': { ok: true },
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
  await renderWithApi(<DraftPage look={draft} />);
  expect(await screen.findByText(lookbook.draft.eyebrow)).toBeTruthy();
  expect(screen.getByText(lookbook.mix(1, 0))).toBeTruthy();
  expect(screen.getByText(lookbook.draft.untagged)).toBeTruthy();
  expect(screen.getByTestId('draft-picture')).toBeTruthy();
  // Nothing is drawn by itself on opening.
  const renders = () => calls.filter((c) => c.method === 'POST' && c.url.endsWith('/render'));
  expect(renders()).toHaveLength(0);
  // The hanger swaps from her wardrobe; the picture is now one change behind.
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  await fireEvent.press(await screen.findByRole('radio', { name: 'Navy silk top' }));
  expect(await screen.findByText(lookbook.swap.swapped('Navy silk top'))).toBeTruthy();
  expect(await screen.findByTestId('draft-picture-stale')).toBeTruthy();
  expect(screen.getAllByLabelText(lookbook.draft.behind(1)).length).toBeGreaterThan(0);
  expect(renders()).toHaveLength(0);
  // The pill opens the card; its option draws the model, and the count clears.
  await fireEvent.press(screen.getByTestId('adjust-pill'));
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.draft.updateModel(1) }));
  await waitFor(() => expect(renders()).toHaveLength(1));
  expect(screen.getByText(lookbook.draft.modelAsked)).toBeTruthy();
  expect(screen.queryAllByLabelText(lookbook.draft.behind(1))).toHaveLength(0);
});

test('a swap on the draft lands at once behind Undo, which puts the rack back', async () => {
  const draft = look({ status: 'draft' });
  const calls = mockFetch({
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Navy wool coat', category: 'Outerwear' })],
      nextCursor: null,
    },
    'GET /looks': { items: [], nextCursor: null },
    'POST /me/memory': { ok: true },
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...draft,
      updatedAt: new Date().toISOString(),
      ...JSON.parse(String(init.body)),
      pieces: draft.pieces,
    }),
  });
  await renderWithApi(<DraftPage look={draft} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  await fireEvent.press(await screen.findByRole('radio', { name: 'Navy wool coat' }));
  expect(await screen.findByText(lookbook.swap.swapped('Navy wool coat'))).toBeTruthy();
  await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1));
  const swapped = calls.find((c) => c.method === 'PATCH')?.body as {
    pieces: { pieceId: string }[];
  };
  expect(swapped.pieces.map((p) => p.pieceId)).toEqual([SCARF]);
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(2));
  const back = calls.filter((c) => c.method === 'PATCH')[1]?.body as {
    pieces: { pieceId: string }[];
  };
  expect(back.pieces.map((p) => p.pieceId)).toEqual([PIECE_ID]);
});

test('a render that failed says so on the picture', async () => {
  mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /looks': { items: [], nextCursor: null },
    'GET /me/model': MODEL,
  });
  const draft = look({
    status: 'draft',
    onModel: 'failed',
    pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
  });
  await renderWithApi(<DraftPage look={draft} />);
  expect(await screen.findByText(lookbook.figure.undressed('her'))).toBeTruthy();
});

test('her photograph is added to the draft from the camera on the picture', async () => {
  const draft = look({ status: 'draft' });
  const photo = piece().image;
  if (!photo) throw new Error('fixture piece has an image');
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /looks': { items: [], nextCursor: null },
    [`POST /looks/${LOOK_ID}/photo`]: { ...draft, photo, image: photo, record: 'photo' },
  });
  await renderWithApi(<DraftPage look={draft} />);
  expect(screen.queryByRole('radio', { name: looks.page.record.you })).toBeNull();
  await fireEvent.press(await screen.findByRole('button', { name: looks.page.addPhoto }));
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.add.doors.cameraRoll }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/photo'))?.body).toEqual({ assetId: ASSET_ID }),
  );
});

test('a draft with her photograph: You · Model under the picture, ↻ on it', async () => {
  const photo = piece().image;
  if (!photo) throw new Error('fixture piece has an image');
  const mine = look({ status: 'draft', photo, image: photo, record: 'photo' });
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /looks': { items: [], nextCursor: null },
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...mine,
      ...JSON.parse(String(init.body)),
    }),
  });
  await renderWithApi(<DraftPage look={mine} />);
  expect(await screen.findByRole('radio', { name: looks.page.record.you })).toBeTruthy();
  expect(screen.getByRole('button', { name: looks.page.replacePhoto })).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: looks.page.record.model }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ record: 'model' }),
  );
});
