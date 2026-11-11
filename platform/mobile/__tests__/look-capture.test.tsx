import { lookbook } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
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
  expect(screen.queryByTestId('draft-generate')).toBeNull();
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
