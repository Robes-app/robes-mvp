import { parseShots, REVIEW_MAX, reviewHref, startRead } from '../src/features/wardrobe/add/flow';
import {
  UPLOAD_MAX,
  uploadPhoto,
  uploadResize,
  withDeadline,
} from '../src/features/wardrobe/add-pieces';
import { api } from '../src/lib/api';
import { mockFetch } from './support/api';
import { ASSET_ID, JOB_ID } from './support/fixtures';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
const mockResize = jest.fn();
const mockManipulate = jest.fn((_uri: string) => {
  const context = {
    renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///tmp/converted.jpg' }) }),
    resize: (size: object) => {
      mockResize(size);
      return context;
    },
  };
  return context;
});
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
  SaveFormat: { JPEG: 'jpeg' },
}));

// What the phone lifted out of the photo (the native module, absent under jest): null unless a
// test says otherwise, as on Android, the Simulator and iOS 16.
const mockLift = jest.fn(async (_uri: string): Promise<unknown> => null);
const mockDiscard = jest.fn();
jest.mock('../src/lib/lift', () => ({
  LIFT_PATIENCE_MS: 50,
  liftPhoto: (uri: string) => mockLift(uri),
  discardLift: (lift: unknown) => mockDiscard(lift),
  within: jest.requireActual('../src/lib/lift').within,
}));
const LIFT_URL = 'http://minio.test/robes/uploads/x/lift?sig=2';
const liftFile = () => ({
  size: 4096,
  upload: async (url: string, opts: { httpMethod: string; headers?: Record<string, string> }) => {
    const res = await fetch(url, { method: opts.httpMethod, headers: opts.headers });
    return { status: res.status };
  },
});
const LIFT_ROUTE = {
  [`POST /uploads/${ASSET_ID}/lift`]: {
    upload: {
      method: 'PUT',
      url: LIFT_URL,
      headers: { 'content-type': 'image/png' },
      expiresAt: '2026-09-24T11:00:00.000Z',
    },
  },
  'PUT /robes/uploads/x/lift': {},
};

const PUT_URL = 'http://minio.test/robes/uploads/x/original?sig=1';
const UPLOAD = {
  'POST /uploads': {
    assetId: ASSET_ID,
    upload: {
      method: 'PUT',
      url: PUT_URL,
      headers: { 'content-type': 'image/jpeg' },
      expiresAt: '2026-09-24T11:00:00.000Z',
    },
  },
  'PUT /robes/uploads/x/original': {},
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
};

test('a photo goes presigned PUT → complete, then its read starts', async () => {
  const calls = mockFetch({
    ...UPLOAD,
    'POST /wardrobe/photo-reads': { jobId: JOB_ID, status: 'queued' },
  });
  await expect(
    startRead(api, { uri: 'file:///tmp/a.jpg', mimeType: 'image/heic', fileSize: null }),
  ).resolves.toBe(JOB_ID);
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
    'POST /api/v1/uploads',
    'PUT /robes/uploads/x/original',
    `POST /api/v1/uploads/${ASSET_ID}/complete`,
    'POST /api/v1/wardrobe/photo-reads',
  ]);
  // The picker said HEIC but the bytes are a JPEG: the bytes decide. No file size from the picker:
  // the file's own size is declared, and the signed headers are sent.
  expect(calls[0]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/jpeg', bytes: 2048 });
  expect(calls[1]?.headers).toEqual({ 'content-type': 'image/jpeg' });
  expect(calls[3]?.body).toEqual({ assetId: ASSET_ID });
});

// Cutout brief (21 Nov): on an iPhone the photo is lifted as it uploads, and what was lifted goes
// up beside it before the read starts, so the server can cut each piece out.
test('what the phone lifted goes up beside the photo, before its read starts', async () => {
  mockLift.mockResolvedValueOnce({ file: liftFile(), items: 2, ms: 300 });
  const calls = mockFetch({
    ...UPLOAD,
    ...LIFT_ROUTE,
    'POST /wardrobe/photo-reads': { jobId: JOB_ID, status: 'queued' },
  });
  await expect(startRead(api, { uri: 'file:///tmp/a.jpg' })).resolves.toBe(JOB_ID);
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
    'POST /api/v1/uploads',
    'PUT /robes/uploads/x/original',
    `POST /api/v1/uploads/${ASSET_ID}/complete`,
    `POST /api/v1/uploads/${ASSET_ID}/lift`,
    'PUT /robes/uploads/x/lift',
    'POST /api/v1/wardrobe/photo-reads',
  ]);
  expect(calls[3]?.body).toEqual({ bytes: 4096 });
  expect(calls[4]?.headers).toEqual({ 'content-type': 'image/png' });
  // The file is the phone's to clear once it is up.
  expect(mockDiscard).toHaveBeenCalledTimes(1);
});

test('a lift that fails to upload, or takes too long, never holds the read back', async () => {
  mockDiscard.mockClear();
  mockLift.mockResolvedValueOnce({ file: liftFile(), items: 1, ms: 300 });
  const refused = mockFetch({
    ...UPLOAD,
    [`POST /uploads/${ASSET_ID}/lift`]: () => {
      throw new Error('refused');
    },
    'POST /wardrobe/photo-reads': { jobId: JOB_ID, status: 'queued' },
  });
  await expect(startRead(api, { uri: 'file:///tmp/a.jpg' })).resolves.toBe(JOB_ID);
  expect(refused.at(-1)?.path).toBe('/api/v1/wardrobe/photo-reads');
  expect(mockDiscard).toHaveBeenCalledTimes(1);

  mockLift.mockReturnValueOnce(new Promise(() => {}));
  const slow = mockFetch({
    ...UPLOAD,
    'POST /wardrobe/photo-reads': { jobId: JOB_ID, status: 'queued' },
  });
  await expect(startRead(api, { uri: 'file:///tmp/a.jpg' })).resolves.toBe(JOB_ID);
  expect(slow.some((c) => c.path.endsWith('/lift'))).toBe(false);
});

test('only a wardrobe photo on its way to a read is lifted', async () => {
  mockLift.mockClear();
  mockFetch(UPLOAD);
  await uploadPhoto(api, { uri: 'file:///tmp/a.jpg' });
  await uploadPhoto(api, { uri: 'file:///tmp/a.jpg' }, 'look_photo', { lift: true });
  expect(mockLift).not.toHaveBeenCalled();
});

// The presigned PUT signs the byte count: the bytes sent are declared, never the picker's
// `fileSize` (the picker re-encodes, so it can describe a different file; storage refused it).
test('an unknown picker mime type uploads as JPEG, the bytes sent are declared, and nothing follows a failed upload', async () => {
  const calls = mockFetch({
    'POST /uploads': () => {
      throw new Error('stop');
    },
  });
  await expect(
    uploadPhoto(api, { uri: 'file:///tmp/b', mimeType: 'application/octet-stream', fileSize: 10 }),
  ).rejects.toThrow();
  expect(calls[0]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/jpeg', bytes: 2048 });
  expect(calls.some((c) => c.method === 'PUT')).toBe(false);
});

test('a photo file with no bytes stops before anything is sent', async () => {
  const calls = mockFetch(UPLOAD);
  await expect(uploadPhoto(api, { uri: 'file:///tmp/empty.jpg' })).rejects.toThrow('empty photo');
  expect(calls).toEqual([]);
});

test("Review's shots survive the trip through the route, and only well-formed ones", () => {
  const shots = [{ uri: 'file:///a.jpg', width: 800, height: 1000, jobId: JOB_ID }];
  const href = reviewHref({ to: 'wishlist', from: 'camera', shots }) as unknown as {
    params: { shots: string; to: string };
  };
  expect(href.params.to).toBe('wishlist');
  expect(parseShots(href.params.shots)).toEqual(shots);
  expect(parseShots('not json')).toEqual([]);
  expect(parseShots(JSON.stringify([{ uri: 1 }, ...shots]))).toEqual(shots);
  const many = Array.from({ length: 20 }, (_, i) => ({ uri: `file:///${i}`, width: 1, height: 1 }));
  expect(parseShots(JSON.stringify(many))).toHaveLength(REVIEW_MAX);
});

// 7 Nov: the iOS picker handed back the original HEIC labelled image/jpeg, and every such photo
// failed in the renderer (heic_unsupported).
test('a HEIC photo labelled JPEG is re-encoded to JPEG on the phone before it uploads', async () => {
  mockManipulate.mockClear();
  const calls = mockFetch(UPLOAD);
  await uploadPhoto(api, { uri: 'file:///tmp/IMG_1.heic', mimeType: 'image/jpeg' });
  expect(mockManipulate).toHaveBeenCalledWith('file:///tmp/IMG_1.heic');
  expect(calls[0]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/jpeg', bytes: 2048 });
  expect(calls.map((c) => c.method)).toEqual(['POST', 'PUT', 'POST']);
});

test('a PNG uploads as PNG, untouched', async () => {
  mockManipulate.mockClear();
  const calls = mockFetch(UPLOAD);
  await uploadPhoto(api, { uri: 'file:///tmp/shot.png', mimeType: 'image/jpeg' });
  expect(mockManipulate).not.toHaveBeenCalled();
  expect(calls[0]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/png', bytes: 2048 });
});

// The server keeps 2048 on the long side; a bigger photo is shrunk on the phone before it goes.
test('a photo larger than the server keeps is shrunk to 2048 on its long side, aspect kept', async () => {
  expect(UPLOAD_MAX).toBe(2048);
  expect(uploadResize(4032, 3024)).toEqual({ width: 2048 });
  expect(uploadResize(3024, 4032)).toEqual({ height: 2048 });
  expect(uploadResize(2048, 1536)).toBeNull();
  expect(uploadResize(null, 4032)).toBeNull();

  mockManipulate.mockClear();
  mockResize.mockClear();
  const calls = mockFetch(UPLOAD);
  await uploadPhoto(api, { uri: 'file:///tmp/big.jpg', width: 3024, height: 4032 });
  expect(mockManipulate).toHaveBeenCalledWith('file:///tmp/big.jpg');
  expect(mockResize).toHaveBeenCalledWith({ height: 2048 });
  expect(calls[0]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/jpeg', bytes: 2048 });
});

test('a photo that already fits uploads untouched', async () => {
  mockManipulate.mockClear();
  mockFetch(UPLOAD);
  await uploadPhoto(api, { uri: 'file:///tmp/small.jpg', width: 1600, height: 1200 });
  expect(mockManipulate).not.toHaveBeenCalled();
});

test('an upload that never answers is aborted and fails at its deadline', async () => {
  jest.useFakeTimers();
  try {
    let seen: AbortSignal | undefined;
    const stuck = withDeadline(60_000, (signal) => {
      seen = signal;
      return new Promise<string>(() => {});
    });
    jest.advanceTimersByTime(59_999);
    expect(seen?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    await expect(stuck).rejects.toThrow('upload timed out after 60000 ms');
    expect(seen?.aborted).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});

test('an upload that answers in time keeps its answer', async () => {
  await expect(withDeadline(60_000, async () => 'asset')).resolves.toBe('asset');
});
