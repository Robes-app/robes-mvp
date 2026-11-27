import { lookbook, wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { LookCapture } from '../src/features/capture/LookCapture';
import { DraftLook } from '../src/features/looks/DraftLook';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, JOB_ID, LOOK_ID, look, piece } from './support/fixtures';
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
let mockGranted = true;
let mockCanAsk = true;
let mockFacing: string | undefined;
jest.mock('expo-camera', () => {
  const { useEffect } = require('react');
  const request = jest.fn(async () => ({ granted: mockGranted }));
  return {
    useCameraPermissions: () => [{ granted: mockGranted, canAskAgain: mockCanAsk }, request],
    // The preview renders nothing here; it hands back the shutter's ref and reports itself ready.
    CameraView: ({
      ref,
      facing,
      onCameraReady,
    }: {
      ref?: { current: unknown };
      facing?: string;
      onCameraReady?: () => void;
    }) => {
      mockFacing = facing;
      useEffect(() => {
        if (ref) ref.current = { takePictureAsync: mockTakePicture };
        onCameraReady?.();
      });
      return null;
    },
  };
});

const copy = lookbook.draftLook.capture;
const cam = copy.camera;
const DAY = '2026-11-10';
const PICKED = { uri: 'file:///tmp/library.jpg', mimeType: 'image/jpeg', width: 900, height: 1200 };
const SHOES = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const crop = (i: number) => `cccccccc-cccc-4ccc-8ccc-cccccccccc0${i}`;
const PHOTO = {
  assetId: ASSET_ID,
  status: 'ready' as const,
  width: 800,
  height: 1000,
  blurhash: null,
  renditions: [{ width: 320, avif: 'http://m.test/320.avif', webp: 'http://m.test/320.webp' }],
};

const captured = (overrides: Parameters<typeof look>[0] = {}) =>
  look({
    status: 'draft',
    source: 'capture',
    timesWorn: 0,
    lastWornOn: null,
    pieces: [],
    proposals: [],
    record: 'photo',
    ...overrides,
  });

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
    colourShade: null,
    colourExtra: [],
    print: null,
    material: null,
    box: { x: 0.3, y: 0.1 + index * 0.3, w: 0.4, h: 0.2 },
    match: null,
    cropAssetId: crop(index),
    ...over,
  };
}
const READ = [
  readPiece(0, 'Cropped sweatshirt', 'Tops'),
  readPiece(1, 'Leggings', 'Bottoms'),
  readPiece(2, 'Running trainers', 'Shoes', { match: { pieceId: SHOES, confidence: 0.8 } }),
];
const shoes = piece({
  id: SHOES,
  label: 'White running shoes',
  category: 'Shoes',
  categoryL2: 'Trainers',
  image: null,
});

// The draft as the server holds it: every write to the rack comes back as the look.
function draftRoutes(start = captured()) {
  let current = start;
  return {
    'GET /looks': { items: [], nextCursor: null },
    'GET /me/model': null,
    'GET /today': { date: DAY, hour: 9, firstName: null, today: [], diary: null },
    'GET /wardrobe/summary': { total: 1, categories: [{ category: 'Shoes', count: 1 }] },
    'GET /wardrobe/items': { items: [shoes], nextCursor: null },
    'GET /wishlist/items': { items: [], nextCursor: null },
    [`GET /looks/${LOOK_ID}`]: () => current,
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        pieces?: Array<{ pieceId: string }>;
        proposals?: unknown[];
      };
      current = captured({
        ...current,
        pieces: (body.pieces ?? []).map(() => ({ piece: shoes, slot: null, role: null })),
        proposals: (body.proposals ?? current.proposals) as never,
        updatedAt: new Date(Date.parse(current.updatedAt) + 1000).toISOString(),
      });
      return current;
    },
    [`POST /looks/${LOOK_ID}/pieces/find`]: { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: {
      id: JOB_ID,
      kind: 'wardrobe_pieces',
      status: 'succeeded',
      stage: 'text',
      output: { assetId: ASSET_ID, noItemDetected: false, readPieces: READ },
      error: null,
      cancelRequested: false,
      createdAt: '2026-11-10T10:00:00.000Z',
      updatedAt: '2026-11-10T10:00:00.000Z',
      finishedAt: '2026-11-10T10:00:01.000Z',
    },
  };
}

beforeEach(() => {
  mockGranted = true;
  mockCanAsk = true;
  jest.clearAllMocks();
});

test('the rear camera with its hint; a shot goes to review, Retake and back come back', async () => {
  mockFetch(UPLOAD);
  await renderWithApi(<LookCapture day={DAY} />);
  expect(screen.getByText(cam.hint)).toBeTruthy();
  expect(mockFacing).toBe('back');
  await fireEvent.press(screen.getByRole('button', { name: cam.shutter }));
  expect(await screen.findByTestId('capture-review')).toBeTruthy();
  expect(screen.getByText(cam.reviewNote)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: cam.retake }));
  expect(await screen.findByText(cam.hint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: cam.shutter }));
  await fireEvent.press(await screen.findByRole('button', { name: cam.back }));
  expect(await screen.findByTestId('capture-camera')).toBeTruthy();
  // Close leaves with nothing kept.
  await fireEvent.press(screen.getByRole('button', { name: cam.close }));
  expect(mockRouter.back).toHaveBeenCalled();
});

test('Use photo uploads it, makes the draft that carries it, and opens the draft for the day', async () => {
  const calls = mockFetch({ ...UPLOAD, 'POST /looks': captured() });
  await renderWithApi(<LookCapture day={DAY} />);
  await fireEvent.press(screen.getByRole('button', { name: cam.shutter }));
  await fireEvent.press(await screen.findByRole('button', { name: cam.use }));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}?day=${DAY}`),
  );
  expect(calls.find((c) => c.path.endsWith('/uploads'))?.body).toMatchObject({
    kind: 'look_photo',
  });
  expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/looks'))?.body).toEqual({
    status: 'draft',
    pieces: [],
    photoAssetId: ASSET_ID,
  });
});

test('a photo that could not be kept says so and stays on review', async () => {
  mockFetch({ ...UPLOAD, 'POST /looks': errorReply(500, 'internal') });
  await renderWithApi(<LookCapture day={null} />);
  await fireEvent.press(screen.getByRole('button', { name: cam.shutter }));
  await fireEvent.press(await screen.findByRole('button', { name: cam.use }));
  expect(await screen.findByText(cam.failed)).toBeTruthy();
  expect(screen.getByTestId('capture-review')).toBeTruthy();
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('a refused camera says how to allow it; her photos still work', async () => {
  mockGranted = false;
  mockCanAsk = false;
  mockFetch(UPLOAD);
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValueOnce({ canceled: false, assets: [PICKED] } as never);
  await renderWithApi(<LookCapture day={null} />);
  expect(screen.getByText(cam.denied)).toBeTruthy();
  expect(screen.getByRole('button', { name: cam.shutter })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: cam.photos }));
  expect(await screen.findByTestId('capture-review')).toBeTruthy();
});

test('a draft from her photo: the Find the pieces card, and Skip keeps just the photo', async () => {
  const calls = mockFetch(draftRoutes(captured({ photo: PHOTO, image: PHOTO })));
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  expect(await screen.findByTestId('capture-rack-ask')).toBeTruthy();
  expect(screen.getByText(copy.card.title)).toBeTruthy();
  expect(screen.getByText(copy.card.sub)).toBeTruthy();
  // The photograph and its rack: no prompt card, no Generate.
  expect(screen.queryByTestId('styling-card')).toBeNull();
  expect(screen.queryByTestId('prompt-send')).toBeNull();
  await fireEvent.press(screen.getByTestId('capture-skip'));
  expect(await screen.findByTestId('capture-rack-photo')).toBeTruthy();
  expect(screen.getByText(copy.card.later)).toBeTruthy();
  expect(screen.queryByTestId('capture-skip')).toBeNull();
  expect(calls.some((c) => c.path.endsWith('/pieces/find'))).toBe(false);
});

test('an untouched photo closes without a question and is let go', async () => {
  const calls = mockFetch({ ...draftRoutes(), [`DELETE /looks/${LOOK_ID}`]: { ok: true } });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await screen.findByTestId('capture-rack-ask');
  await fireEvent.press(screen.getByTestId('draft-close'));
  await act(async () => {
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  });
  expect(screen.queryByText(copy.discard.title)).toBeNull();
});

test('Find the pieces: a row per piece; the suggestion matches in one tap; Remove has Undo', async () => {
  const calls = mockFetch(draftRoutes());
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  expect(await screen.findByTestId('capture-rack-rack')).toBeTruthy();
  expect(screen.getByText('Cropped sweatshirt')).toBeTruthy();
  expect(screen.getByText('Leggings')).toBeTruthy();
  expect(screen.getByText('Running trainers')).toBeTruthy();
  // Two rows have no close match; the trainers look like hers.
  expect(screen.getAllByText(copy.row.noMatch)).toHaveLength(2);
  expect(screen.getByText(copy.row.looksLike)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: copy.row.match })).toHaveLength(3);
  expect(screen.getAllByRole('button', { name: copy.row.add })).toHaveLength(3);
  const written = () =>
    calls.filter((c) => c.method === 'PATCH').at(-1)?.body as {
      pieces: Array<{ pieceId: string }>;
      proposals: Array<{ name: string; capture: { readId: string; index: number } }>;
    };
  await waitFor(() => expect(written()?.proposals).toHaveLength(3));
  expect(written().proposals[2]?.capture).toMatchObject({ readId: JOB_ID, index: 2 });

  // One tap on the suggestion files the row as her piece.
  await fireEvent.press(screen.getByRole('button', { name: copy.row.quick }));
  await waitFor(() => expect(written().pieces).toEqual([{ pieceId: SHOES, role: null }]));
  expect(written().proposals.map((p) => p.name)).toEqual(['Cropped sweatshirt', 'Leggings']);
  expect(await screen.findByText('White running shoes')).toBeTruthy();
  expect(screen.queryByText('Running trainers')).toBeNull();

  // Remove hides a row behind Undo, which puts it back.
  const [removeTop] = screen.getAllByRole('button', { name: copy.row.remove });
  await fireEvent.press(removeTop as never);
  expect(await screen.findByText(copy.removed(1))).toBeTruthy();
  expect(screen.queryByText('Cropped sweatshirt')).toBeNull();
  await fireEvent.press(screen.getByTestId('capture-undo'));
  expect(await screen.findByText('Cropped sweatshirt')).toBeTruthy();
  expect(screen.queryByText(copy.removed(1))).toBeNull();
  await waitFor(() => expect(written().proposals).toHaveLength(2));
});

// Annie, 27 Nov (supersedes D1's draw as the read lands): finding the pieces draws nothing. The
// pill on her photograph dresses her model in all of them at once, nothing filed.
const RENDER = { [`POST /looks/${LOOK_ID}/render`]: { jobId: JOB_ID, status: 'queued' } };
const renders = (calls: ReturnType<typeof mockFetch>) =>
  calls.filter((c) => c.method === 'POST' && c.path.endsWith(`/looks/${LOOK_ID}/render`));
const pillSays = async (label: string) =>
  expect(within(await screen.findByTestId('model-pill')).getByText(label)).toBeTruthy();

test('the pieces found on a captured draft are written and wait for the pill, which dresses her model once', async () => {
  const calls = mockFetch({ ...draftRoutes(), ...RENDER });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  // A photograph with nothing found has nothing to dress her model in.
  await screen.findByTestId('capture-find');
  expect(screen.queryByTestId('model-pill')).toBeNull();
  await fireEvent.press(screen.getByTestId('capture-find'));
  await screen.findByTestId('capture-rack-rack');
  const write = () =>
    calls.findIndex(
      (c) => c.method === 'PATCH' && (c.body as { proposals?: unknown[] }).proposals?.length === 3,
    );
  await waitFor(() => expect(write()).toBeGreaterThanOrEqual(0));
  await pillSays(lookbook.draft.modelAsked);
  await act(() => new Promise((r) => setTimeout(r, 1500)));
  expect(renders(calls)).toHaveLength(0);
  // One tap draws every found piece, on the rack as written, with nothing filed.
  await fireEvent.press(screen.getByTestId('model-pill'));
  await waitFor(() => expect(renders(calls)).toHaveLength(1));
  expect(write()).toBeLessThan(calls.indexOf(renders(calls)[0] as never));
  expect(screen.queryByTestId('model-pill')).toBeNull();
  expect(calls.some((c) => c.path.includes('/wardrobe/') && c.method === 'POST')).toBe(false);
});

// Filing a found piece keeps the picture current (Annie, 26 Nov: the server carries it), so it
// never raises the pill; any other change by hand raises it and draws nothing by itself.
test('once drawn, filing a found piece raises no pill; a piece taken off does, and draws nothing', async () => {
  const routes = draftRoutes();
  const patch = routes[`PATCH /looks/${LOOK_ID}`] as (init: RequestInit) => ReturnType<typeof look>;
  let drawn = false;
  let last = captured();
  const calls = mockFetch({
    ...routes,
    // The picture reads pending once asked for, and has landed by the read after.
    [`GET /looks/${LOOK_ID}`]: () => {
      const now = last;
      if (last.onModel === 'pending') last = { ...last, model: PHOTO, onModel: 'ready' };
      return now;
    },
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { filed?: unknown[] };
      last = {
        ...patch(init),
        model: drawn ? PHOTO : null,
        onModel: drawn ? 'ready' : null,
        pictureStale: drawn && !body.filed,
      };
      return last;
    },
    [`POST /looks/${LOOK_ID}/render`]: () => {
      drawn = true;
      last = { ...last, onModel: 'pending', pictureStale: false };
      return { jobId: JOB_ID, status: 'queued' };
    },
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  await screen.findByTestId('capture-rack-rack');
  await fireEvent.press(await screen.findByTestId('model-pill'));
  await waitFor(() => expect(renders(calls)).toHaveLength(1));
  expect(screen.queryByTestId('model-pill')).toBeNull();
  // The picture lands, wearing every found piece.
  await waitFor(() => expect(last.onModel).toBe('ready'), { timeout: 8000 });
  await waitFor(() => expect(screen.queryByTestId('scan-line')).toBeNull(), { timeout: 8000 });
  const found = calls.find(
    (c) => c.method === 'PATCH' && (c.body as { proposals?: unknown[] }).proposals?.length === 3,
  )?.body as { proposals: Array<{ key: string; name: string }> };
  const trainers = found.proposals.find((p) => p.name === 'Running trainers')?.key;

  // Matched to her shoes: the write says what was filed, and the picture stays current.
  await fireEvent.press(screen.getByRole('button', { name: copy.row.quick }));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toMatchObject({
      pieces: [{ pieceId: SHOES, role: null }],
      filed: [{ from: trainers, to: SHOES }],
    }),
  );
  await act(() => new Promise((r) => setTimeout(r, 1500)));
  expect(screen.queryByTestId('model-pill')).toBeNull();
  expect(renders(calls)).toHaveLength(1);

  // A found piece taken off is a change the picture is behind on: the pill, and no draw.
  const [removeTop] = screen.getAllByRole('button', { name: copy.row.remove });
  await fireEvent.press(removeTop as never);
  await pillSays(lookbook.draft.updateModel(1));
  await act(() => new Promise((r) => setTimeout(r, 1500)));
  expect(renders(calls)).toHaveLength(1);
});

test('a captured photo whose pieces are never found is never drawn', async () => {
  const calls = mockFetch({
    ...draftRoutes(captured({ photo: PHOTO, image: PHOTO })),
    ...RENDER,
    [`POST /looks/${LOOK_ID}/save`]: captured({ status: 'saved', photo: PHOTO, image: PHOTO }),
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-skip'));
  await screen.findByTestId('capture-rack-photo');
  await fireEvent.press(screen.getByTestId('draft-done'));
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/save'))).toBe(true));
  expect(renders(calls)).toHaveLength(0);
});

test('the pieces found on a saved look are kept at once, with no Update look, and wait for the pill', async () => {
  const saved = captured({ status: 'saved', photo: PHOTO, image: PHOTO });
  const routes = draftRoutes(saved);
  const calls = mockFetch({
    ...routes,
    ...RENDER,
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...(routes[`PATCH /looks/${LOOK_ID}`] as (i: RequestInit) => object)(init),
      status: 'saved',
    }),
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="saved" onClose={jest.fn()} />);
  await fireEvent.press(await screen.findByTestId('capture-find'));
  // On a saved look the found pieces join its own rack.
  expect(await screen.findByText('Cropped sweatshirt')).toBeTruthy();
  await waitFor(() =>
    expect(
      (calls.find((c) => c.method === 'PATCH')?.body as { proposals?: unknown[] } | undefined)
        ?.proposals,
    ).toHaveLength(3),
  );
  expect(screen.queryByTestId('update-look')).toBeNull();
  await pillSays(lookbook.draft.modelAsked);
  expect(renders(calls)).toHaveLength(0);
  await fireEvent.press(screen.getByTestId('model-pill'));
  await waitFor(() => expect(renders(calls)).toHaveLength(1));
});

test('Match to piece opens the picker as Match to your wardrobe, the suggestion ticked', async () => {
  const calls = mockFetch(draftRoutes());
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  await screen.findByTestId('capture-rack-rack');
  const match = screen.getAllByRole('button', { name: copy.row.match });
  await fireEvent.press(match[2] as never);
  expect(await screen.findByText(copy.match.title)).toBeTruthy();
  const confirm = await screen.findByTestId('picker-confirm');
  expect(screen.getByText(copy.match.cta)).toBeTruthy();
  await waitFor(() => expect(confirm).toBeEnabled());
  await fireEvent.press(confirm);
  await waitFor(() =>
    expect(
      (calls.filter((c) => c.method === 'PATCH').at(-1)?.body as { pieces?: unknown[] } | undefined)
        ?.pieces,
    ).toEqual([{ pieceId: SHOES, role: null }]),
  );
  // The piece Robes saw in her photograph is the one the picture wears: filed, never a change.
  expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toHaveProperty('filed');
});

const WISH = '88888888-8888-4888-8888-888888888888';
const wishOf = (over: object = {}) => ({
  id: WISH,
  label: 'Black leather biker jacket',
  category: 'Outerwear',
  categoryL2: null,
  categoryL3: null,
  color: 'black',
  brand: 'Totême',
  note: null,
  price: 1200,
  currency: 'EUR',
  size: null,
  sourceUrl: null,
  sourceLabel: null,
  image: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...over,
});
const lastProposals = (calls: ReturnType<typeof mockFetch>) =>
  (
    calls.filter((c) => c.method === 'PATCH').at(-1)?.body as
      | { proposals?: Array<{ name: string; wishlistItemId: string | null }> }
      | undefined
  )?.proposals;

test('Match to your wardrobe takes a wish from WISHLIST: it stands in the row as a piece to find', async () => {
  const calls = mockFetch({
    ...draftRoutes(),
    'GET /wishlist/items': { items: [wishOf()], nextCursor: null },
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  await screen.findByTestId('capture-rack-rack');
  const [matchTop] = screen.getAllByRole('button', { name: copy.row.match });
  await fireEvent.press(matchTop as never);
  // WISHLIST is open while matching (TestFlight 20 Nov).
  const tab = await screen.findByRole('tab', { name: wardrobe.segments.wishlist });
  expect(tab.props.accessibilityState?.disabled).not.toBe(true);
  await fireEvent.press(tab);
  await fireEvent.press(
    await screen.findByRole('checkbox', {
      name: lookbook.draftLook.picker.pickWish('Black leather biker jacket'),
    }),
  );
  await fireEvent.press(screen.getByTestId('picker-confirm'));
  await waitFor(() =>
    expect(lastProposals(calls)?.[0]).toMatchObject({
      name: 'Black leather biker jacket',
      wishlistItemId: WISH,
    }),
  );
  expect(lastProposals(calls)?.map((p) => p.name)).toEqual([
    'Black leather biker jacket',
    'Leggings',
    'Running trainers',
  ]);
  // A wish she already had is another piece than the one photographed: nothing says it was
  // filed from the found row, so the picture is behind on it like any swap (Annie, 27 Nov).
  expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).not.toHaveProperty('filed');
});

test('the + on WISHLIST while matching saves the found piece as a new wish, on the rack', async () => {
  const calls = mockFetch({
    ...draftRoutes(),
    [`POST /wardrobe/photo-reads/${JOB_ID}/wishes`]: wishOf({ label: 'Leggings' }),
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  await screen.findByTestId('capture-rack-rack');
  const match = screen.getAllByRole('button', { name: copy.row.match });
  await fireEvent.press(match[1] as never);
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.segments.wishlist }));
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.draftLook.picker.addWish }),
  );
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/wishes'))?.body).toEqual({ index: 1 }),
  );
  await waitFor(() => expect(lastProposals(calls)?.[1]?.wishlistItemId).toBe(WISH));
});

test('the + on OWNED while matching opens Add your pieces, not the found piece', async () => {
  mockFetch({ ...draftRoutes(), 'GET /inbox': { items: [], count: 0 } });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  await screen.findByTestId('capture-rack-rack');
  const [matchTop] = screen.getAllByRole('button', { name: copy.row.match });
  await fireEvent.press(matchTop as never);
  await fireEvent.press(await screen.findByTestId('picker-add-new'));
  // A piece she owns and has not logged yet: Photo files it and it takes the found row.
  expect(await screen.findByTestId('add-pieces-sheet')).toBeTruthy();
  expect(screen.queryByTestId('capture-new-piece')).toBeNull();
});

test('a read that fails says so with Retry, and the photo is kept', async () => {
  mockFetch({
    ...draftRoutes(),
    [`POST /looks/${LOOK_ID}/pieces/find`]: errorReply(500, 'internal'),
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  expect(await screen.findByText(copy.failed)).toBeTruthy();
  expect(screen.getByRole('button', { name: copy.retry })).toBeTruthy();
  expect(screen.getByText(copy.card.later)).toBeTruthy();
});

// Tester trial 25 Nov (B2): the found rows showed no pictures, because their crops render after
// the read and nothing asked for them again until she removed a piece.
const cropUrl = (i: number) => `http://m.test/crop-${i}.webp`;
const cropImage = (i: number, status: 'pending' | 'ready') => ({
  assetId: crop(i),
  status,
  width: status === 'ready' ? 400 : null,
  height: status === 'ready' ? 500 : null,
  blurhash: null,
  renditions: status === 'ready' ? [{ width: 320, avif: cropUrl(i), webp: cropUrl(i) }] : [],
});
const drawn = (url: string) => JSON.stringify(screen.toJSON()).includes(url);

test("a draft's found rows wait on their crops and show them once they render", async () => {
  const routes = draftRoutes();
  const patch = routes[`PATCH /looks/${LOOK_ID}`];
  let rendered = false;
  const withCrops = (l: ReturnType<typeof captured>) =>
    captured({
      ...l,
      captureImages: Object.fromEntries(
        (l.proposals ?? []).flatMap((p) =>
          p.capture
            ? [[p.key, cropImage(p.capture.index, rendered ? 'ready' : 'pending')] as const]
            : [],
        ),
      ),
    });
  const calls = mockFetch({
    ...routes,
    // The write lands before the crops render; the next read of the look has them.
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => withCrops(patch(init)),
    [`GET /looks/${LOOK_ID}`]: () => {
      const out = withCrops(routes[`GET /looks/${LOOK_ID}`]());
      if (out.proposals.length) rendered = true;
      return out;
    },
  });
  await renderWithApi(
    <DraftLook id={LOOK_ID} day={DAY} presentation="sheet" onClose={jest.fn()} />,
  );
  await fireEvent.press(await screen.findByTestId('capture-find'));
  expect(await screen.findByTestId('capture-rack-rack')).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(drawn(cropUrl(0))).toBe(false);
  await waitFor(() => expect(drawn(cropUrl(0))).toBe(true), { timeout: 8000 });
  expect(drawn(cropUrl(1))).toBe(true);
  // The look itself carried them: no separate read of the crops for a draft.
  expect(calls.some((c) => c.path.endsWith('/crops'))).toBe(false);
}, 15_000);

test("a saved look's found rows show their crops before the look comes back with them", async () => {
  let rendered = false;
  const saved = captured({ status: 'saved', photo: PHOTO, image: PHOTO });
  const calls = mockFetch({
    ...draftRoutes(saved),
    [`GET /wardrobe/photo-reads/${JOB_ID}/crops`]: () => {
      const out = {
        crops: READ.map((p) => ({
          index: p.index,
          image: cropImage(p.index, rendered ? 'ready' : 'pending'),
        })),
      };
      rendered = true;
      return out;
    },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="saved" onClose={jest.fn()} />);
  await fireEvent.press(await screen.findByTestId('capture-find'));
  expect(await screen.findByText('Cropped sweatshirt')).toBeTruthy();
  await waitFor(() => expect(drawn(cropUrl(0))).toBe(true), { timeout: 8000 });
  expect(drawn(cropUrl(2))).toBe(true);
  // The found rows are written at once (D1), and their crops show from the read before the look
  // comes back holding them.
  expect(
    (calls.find((c) => c.method === 'PATCH')?.body as { proposals?: unknown[] } | undefined)
      ?.proposals,
  ).toHaveLength(3);
}, 15_000);
