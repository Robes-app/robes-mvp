import { addPieces, MAX_BATCH } from '../src/features/wardrobe/add-pieces';
import { api } from '../src/lib/api';
import { mockFetch } from './support/api';
import { ASSET_ID, PIECE_ID, piece } from './support/fixtures';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const PUT_URL = 'http://minio.test/robes/uploads/x/original?sig=1';

test('each photo goes presigned PUT → complete, then one batch for all of them', async () => {
  const calls = mockFetch({
    'GET file:///tmp/a.jpg': {},
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
    'POST /wardrobe/items/batch': {
      pieces: [piece({ status: 'reading' })],
      jobs: [{ pieceId: PIECE_ID, jobId: ASSET_ID }],
    },
  });
  const out = await addPieces(api, [
    { uri: 'file:///tmp/a.jpg', mimeType: 'image/heic', fileSize: null },
  ]);
  expect(out.pieces).toHaveLength(1);
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
    'GET file:///tmp/a.jpg',
    'POST /api/v1/uploads',
    'PUT /robes/uploads/x/original',
    `POST /api/v1/uploads/${ASSET_ID}/complete`,
    'POST /api/v1/wardrobe/items/batch',
  ]);
  // No file size from the picker: the blob's size is declared, and the signed headers are sent.
  expect(calls[1]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/heic', bytes: 2048 });
  expect(calls[2]?.headers).toEqual({ 'content-type': 'image/jpeg' });
  expect(calls[4]?.body).toEqual({ assetIds: [ASSET_ID] });
});

test('an unknown picker mime type uploads as JPEG, and batches are capped', async () => {
  expect(MAX_BATCH).toBe(30);
  const calls = mockFetch({
    'GET file:///tmp/b': {},
    'POST /uploads': () => {
      throw new Error('stop');
    },
  });
  await expect(
    addPieces(api, [{ uri: 'file:///tmp/b', mimeType: 'application/octet-stream', fileSize: 10 }]),
  ).rejects.toThrow();
  expect(calls[1]?.body).toEqual({ kind: 'wardrobe', contentType: 'image/jpeg', bytes: 10 });
  // Nothing reaches storage or the batch once the upload can't be created.
  expect(calls.some((c) => c.method === 'PUT' || c.path.endsWith('/batch'))).toBe(false);
});
