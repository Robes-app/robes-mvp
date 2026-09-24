import { expect, test } from '@playwright/test';
import { signUnsub } from '@robes/emails';
import { E2E_UNSUB_KEY } from './env';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

async function me(page: import('@playwright/test').Page) {
  return (await page.request.get('/api/v1/me')).json();
}

test('the email link asks first, then turns off exactly one kind of email', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const { id } = await me(page);
  const token = signUnsub(E2E_UNSUB_KEY, id, 'looksReady');

  // Opened signed out, like from a mail app; opening alone changes nothing.
  const visitor = await browser.newContext();
  const tab = await visitor.newPage();
  await tab.goto(`/unsubscribe?t=${encodeURIComponent(token)}`);
  await expect(tab.getByRole('heading', { name: 'Stop these emails?' })).toBeVisible();
  expect((await me(page)).notifications.looksReady).toBe(true);

  await tab.getByRole('button', { name: 'Stop them' }).click();
  await expect(tab.getByRole('status')).toContainText('You can turn them back on');
  expect((await me(page)).notifications).toMatchObject({ looksReady: false, receipts: true });
  await visitor.close();
});

test('mail clients can unsubscribe in one click (RFC 8058); forged tokens do nothing', async ({
  page,
}) => {
  await signIn(page);
  const { id } = await me(page);
  const token = signUnsub(E2E_UNSUB_KEY, id, 'receipts');
  const oneClick = await page.request.post(`/api/v1/public/unsub/${encodeURIComponent(token)}`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: 'List-Unsubscribe=One-Click',
  });
  expect(oneClick.status()).toBe(200);
  expect((await me(page)).notifications.receipts).toBe(false);

  const forged = signUnsub('not-the-server-key-0123456789abcdefghij', id, 'nudges');
  expect(
    (await page.request.post(`/api/v1/public/unsub/${encodeURIComponent(forged)}`)).status(),
  ).toBe(404);
  const bad = await page.goto(`/unsubscribe?t=${encodeURIComponent(forged)}`);
  expect(bad?.status()).toBe(200);
  await expect(page.getByText('This link doesn’t work any more.', { exact: false })).toBeVisible();
});
