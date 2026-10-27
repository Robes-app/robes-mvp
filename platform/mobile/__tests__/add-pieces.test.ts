import { parseShots, REVIEW_MAX, reviewHref, startRead } from '../src/features/wardrobe/add/flow';
import { uploadPhoto } from '../src/features/wardrobe/add-pieces';
import { api } from '../src/lib/api';
import { mockFetch } from './support/api';
import { ASSET_ID, JOB_ID } from './support/fixtures';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

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
    'GET file:///tmp/a.jpg': {},
    ...UPLOAD,
    'POST /wardrobe/photo-reads': { jobId: JOB_ID, status: 'queued' },
  });
  await expect(
    startRead(api, { uri: 'file:///tmp/a.jpg', mimeType: 'image/heic', fileSize: null }),
  ).resolves.toBe(JOB_ID);
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
    'GET file:///tmp/a.jpg',
    'POST /api/v1/uploads',
    'PUT /robes/uploads/x/original',
    `POST /api/v1/uploads/${ASSET_ID}/complete`,
    'POST /api/v1/wardrobe/photo-reads',
  ]);
  // No file size from the picker: the blob's size is declared, and the signed headers are sent.
  expect(calls[1]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/heic', bytes: 2048 });
  expect(calls[2]?.headers).toEqual({ 'content-type': 'image/jpeg' });
  expect(calls[4]?.body).toEqual({ assetId: ASSET_ID });
});

test('an unknown picker mime type uploads as JPEG, and nothing follows a failed upload', async () => {
  const calls = mockFetch({
    'GET file:///tmp/b': {},
    'POST /uploads': () => {
      throw new Error('stop');
    },
  });
  await expect(
    uploadPhoto(api, { uri: 'file:///tmp/b', mimeType: 'application/octet-stream', fileSize: 10 }),
  ).rejects.toThrow();
  expect(calls[1]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/jpeg', bytes: 10 });
  expect(calls.some((c) => c.method === 'PUT')).toBe(false);
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
