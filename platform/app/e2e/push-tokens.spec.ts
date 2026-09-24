import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

const token = () => `ExponentPushToken[${crypto.randomUUID().replaceAll('-', '')}]`;
const url = (t: string) => `/api/v1/me/push-tokens/${encodeURIComponent(t)}`;

test('a device registers for push, re-registers, and is revoked on sign-out', async ({ page }) => {
  await signIn(page);
  const t = token();
  const data = { expoToken: t, platform: 'ios', appVersion: '1.0.0' };
  expect((await page.request.put('/api/v1/me/push-tokens', { data })).status()).toBe(200);
  expect((await page.request.put('/api/v1/me/push-tokens', { data })).status()).toBe(200);
  const bad = await page.request.put('/api/v1/me/push-tokens', {
    data: { ...data, expoToken: 'not-a-token' },
  });
  expect(bad.status()).toBe(400);
  expect((await page.request.delete(url(t))).status()).toBe(200);
  expect((await page.request.delete(url(t))).status()).toBe(404);
});

test('someone else cannot revoke her device', async ({ page, browser }) => {
  await signIn(page);
  const t = token();
  await page.request.put('/api/v1/me/push-tokens', { data: { expoToken: t, platform: 'android' } });
  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  expect((await otherPage.request.delete(url(t))).status()).toBe(404);
  await other.close();
  expect((await page.request.delete(url(t))).status()).toBe(200);
});
