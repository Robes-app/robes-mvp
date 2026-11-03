import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

const PHOTO = readFileSync(fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url)));

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('notification prefs default, merge and persist', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  expect((await (await api.get('/api/v1/me')).json()).notifications).toEqual({
    looksReady: true,
    morningCue: false,
    nudges: false,
    receipts: true,
  });
  const updated = await (
    await api.patch('/api/v1/me', { data: { notifications: { nudges: true } } })
  ).json();
  expect(updated.notifications).toMatchObject({ nudges: true, looksReady: true });
  const bad = await api.patch('/api/v1/me', { data: { notifications: { marketing: true } } });
  expect(bad.status()).toBe(400);
});

test('deleting an account removes her photos and signs her out (SEC-80)', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const upload = await (
    await api.post('/api/v1/uploads', {
      data: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: PHOTO.length },
    })
  ).json();
  await fetch(upload.upload.url, { method: 'PUT', headers: upload.upload.headers, body: PHOTO });
  await api.post(`/api/v1/uploads/${upload.assetId}/complete`);
  await expect
    .poll(async () => (await (await api.get(`/api/v1/assets/${upload.assetId}`)).json()).status)
    .toBe('ready');
  const { master } = await (await api.get(`/api/v1/assets/${upload.assetId}`)).json();
  expect((await fetch(master)).status).toBe(200);

  expect(await (await api.get('/api/v1/me/deletion')).json()).toEqual({ request: null });
  expect((await api.post('/api/v1/me/deletion', { data: {} })).status()).toBe(400);
  const requested = await api.post('/api/v1/me/deletion', { data: { confirm: 'DELETE' } });
  expect(requested.status()).toBe(202);
  expect((await requested.json()).status).toBe('requested');

  // Dev runs the deletion straight after the response; deployed, the 5-minute schedule does.
  await expect.poll(async () => (await api.get('/api/v1/me')).status()).toBe(401);
  expect((await fetch(master)).status).toBe(404);
});
