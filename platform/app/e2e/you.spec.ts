import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('notification prefs default, merge and persist', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  expect((await (await api.get('/api/v1/me')).json()).notifications).toEqual({
    looksReady: true,
    morningCue: true,
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

test('deleting an account needs typed confirmation and is idempotent', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  expect(await (await api.get('/api/v1/me/deletion')).json()).toEqual({ request: null });
  expect((await api.post('/api/v1/me/deletion', { data: {} })).status()).toBe(400);
  const first = await api.post('/api/v1/me/deletion', { data: { confirm: 'DELETE' } });
  expect(first.status()).toBe(202);
  const again = await (
    await api.post('/api/v1/me/deletion', { data: { confirm: 'DELETE' } })
  ).json();
  expect(again).toEqual(await first.json());
  expect((await (await api.get('/api/v1/me/deletion')).json()).request.status).toBe('requested');
});
