import { lookbook, looks, ui, wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Composer } from '../src/features/looks/Composer';
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
  await renderWithApi(<Composer />);
  expect(await screen.findByText(lookbook.figure.head(0))).toBeTruthy();
  for (const slot of Object.values(lookbook.figure.slots)) {
    expect(screen.getByRole('button', { name: slot })).toBeTruthy();
  }
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
  await renderWithApi(<Composer pieceId={PIECE_ID} />);
  await waitFor(() => expect(alert).toHaveBeenCalled());
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: lookbook.bar.save }).props.accessibilityState.busy,
    ).toBe(false),
  );
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

test('a slot opens her wardrobe on its category, and All still widens it', async () => {
  mockFetch({
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Silk shirt', category: 'Tops' })],
      nextCursor: null,
    },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<Composer />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.figure.slots.top }));
  expect(await screen.findByRole('radio', { name: 'Silk shirt' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'Camel wool coat' })).toBeNull();
  await fireEvent.press(screen.getByText(lookbook.swap.all));
  expect(await screen.findByRole('radio', { name: 'Camel wool coat' })).toBeTruthy();
});

test('the empty draft stands her model on the canvas with Discard and a held Save at the foot', async () => {
  mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<Composer />);
  expect(await screen.findByText(lookbook.eyebrow.draft)).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.bar.discard })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: lookbook.bar.save }).props.accessibilityState.disabled,
  ).toBe(true);
  // A hotspot titles the sheet for its slot, and Photograph one leads the grid.
  await fireEvent.press(screen.getByRole('button', { name: lookbook.figure.slots.shoes }));
  expect(await screen.findByText(lookbook.sheet.slot.shoes)).toBeTruthy();
  expect(screen.getByText(lookbook.sheet.eyebrow)).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.sheet.photograph })).toBeTruthy();
  expect(screen.getByLabelText(lookbook.sheet.search)).toBeTruthy();
});

test('the sheet searches her whole wardrobe', async () => {
  mockFetch({
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Silk scarf', category: 'Accessories' })],
      nextCursor: null,
    },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<Composer />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.figure.slots.top }));
  await fireEvent.changeText(screen.getByLabelText(lookbook.sheet.search), 'silk');
  expect(await screen.findByRole('radio', { name: 'Silk scarf' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'Camel wool coat' })).toBeNull();
});

test('a piece on the draft dresses her model once the rack settles, a top lights ✓ Top', async () => {
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /looks': { items: [], nextCursor: null },
    'GET /me/model': {
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
    },
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  const draft = look({
    status: 'draft',
    pieces: [{ piece: piece({ category: 'Tops' }), slot: null, role: null }],
  });
  await renderWithApi(<Composer look={draft} />);
  expect(await screen.findByText(lookbook.figure.dressing('her'))).toBeTruthy();
  expect(screen.getByText(lookbook.figure.filled.top)).toBeTruthy();
  await waitFor(
    () => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/render'))).toBe(true),
    { timeout: 4_000 },
  );
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
  await renderWithApi(<Composer look={draft} />);
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

test('her photograph is added to the draft from the camera on the canvas', async () => {
  const draft = look({ status: 'draft' });
  const photo = piece().image;
  if (!photo) throw new Error('fixture piece has an image');
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /looks': { items: [], nextCursor: null },
    [`POST /looks/${LOOK_ID}/photo`]: { ...draft, photo, image: photo, record: 'photo' },
  });
  await renderWithApi(<Composer look={draft} />);
  expect(screen.queryByRole('radio', { name: looks.page.record.you })).toBeNull();
  await fireEvent.press(await screen.findByRole('button', { name: looks.page.addPhoto }));
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.add.doors.cameraRoll }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/photo'))?.body).toEqual({ assetId: ASSET_ID }),
  );
});

test('a draft with her photograph: You · Model under the canvas, ↻ on it, no hotspots', async () => {
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
  await renderWithApi(<Composer look={mine} />);
  expect(await screen.findByRole('radio', { name: looks.page.record.you })).toBeTruthy();
  expect(screen.getByRole('button', { name: looks.page.replacePhoto })).toBeTruthy();
  // The hotspots are drawn for the model's figure; on her photograph they step aside.
  expect(screen.queryByRole('button', { name: lookbook.figure.slots.top })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: looks.page.record.model }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ record: 'model' }),
  );
});
