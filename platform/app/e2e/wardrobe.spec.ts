import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

// Upload → batch → rendition → wardrobe_analyse job → filed piece, entirely on the local stack
// (MinIO + Postgres + the offline AI fake when GEMINI_API_KEY is unset).
const PHOTO = readFileSync(fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url)));

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('a batch of photos becomes filed pieces', async ({ page }) => {
  await signIn(page);
  const api = page.request;

  const upload = await api.post('/api/v1/uploads', {
    data: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: PHOTO.length },
  });
  expect(upload.status()).toBe(201);
  const { assetId, upload: put } = await upload.json();
  const stored = await fetch(put.url, { method: 'PUT', headers: put.headers, body: PHOTO });
  expect(stored.status).toBe(200);
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);

  const batch = await api.post('/api/v1/wardrobe/items/batch', { data: { assetIds: [assetId] } });
  expect(batch.status()).toBe(202);
  const { pieces, jobs } = await batch.json();
  expect(pieces).toHaveLength(1);
  expect(pieces[0]).toMatchObject({ status: 'reading', label: 'New piece' });
  expect(jobs).toHaveLength(1);

  // Re-sending the same photos returns the same piece (natural idempotency).
  const again = await (
    await api.post('/api/v1/wardrobe/items/batch', { data: { assetIds: [assetId] } })
  ).json();
  expect(again.pieces[0].id).toBe(pieces[0].id);
  expect(again.jobs).toHaveLength(0);

  const pieceUrl = `/api/v1/wardrobe/items/${pieces[0].id}`;
  await expect
    .poll(async () => (await (await api.get(pieceUrl)).json()).status, { timeout: 30_000 })
    .toBe('ready');
  const piece = await (await api.get(pieceUrl)).json();
  expect(piece).toMatchObject({
    label: 'Camel wool coat',
    category: 'Outerwear',
    categoryL2: 'Coats',
  });
  expect(piece.image.renditions.length).toBeGreaterThan(0);

  const list = await (await api.get('/api/v1/wardrobe/items')).json();
  expect(list.items.map((p: { id: string }) => p.id)).toContain(piece.id);

  expect((await api.delete(pieceUrl)).ok()).toBe(true);
  expect((await api.get(pieceUrl)).status()).toBe(404);
  expect((await api.post(`${pieceUrl}/restore`)).ok()).toBe(true);
  expect((await api.get(pieceUrl)).status()).toBe(200);
});

test('another user cannot see or change the piece', async ({ page, browser }) => {
  await signIn(page);
  const created = await (
    await page.request.post('/api/v1/wardrobe/items', { data: { label: 'Private coat' } })
  ).json();
  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const url = `/api/v1/wardrobe/items/${created.id}`;
  expect((await otherPage.request.get(url)).status()).toBe(404);
  expect((await otherPage.request.patch(url, { data: { label: 'Mine now' } })).status()).toBe(404);
  expect((await otherPage.request.delete(url)).status()).toBe(404);
  await other.close();
});
