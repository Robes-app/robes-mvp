import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('she downloads her data as one JSON file with only her things (SEC-81)', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const api = page.request;
  await api.post('/api/v1/wardrobe/items', { data: { label: 'Niall export coat' } });

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  await otherPage.request.post('/api/v1/wardrobe/items', { data: { label: 'Bea export coat' } });

  expect(await (await api.get('/api/v1/me/exports')).json()).toEqual({ export: null });
  const requested = await api.post('/api/v1/me/exports');
  expect(requested.status()).toBe(202);
  const first = await requested.json();
  // A second request the same day returns the same export.
  expect((await (await api.post('/api/v1/me/exports')).json()).id).toBe(first.id);

  // Dev builds it straight after the response; deployed, the 5-minute schedule does.
  await expect
    .poll(async () => (await (await api.get('/api/v1/me/exports')).json()).export.status)
    .toBe('ready');
  const { export: ready } = await (await api.get('/api/v1/me/exports')).json();
  expect(ready.id).toBe(first.id);
  const file = await fetch(ready.downloadUrl);
  expect(file.headers.get('content-disposition')).toContain('attachment');
  const doc = await file.json();
  expect(doc.format).toBe('robes-data-export');
  const text = JSON.stringify(doc);
  expect(text).toContain('Niall export coat');
  expect(text).not.toContain('Bea export coat');

  // The other person sees nothing of hers.
  expect(await (await otherPage.request.get('/api/v1/me/exports')).json()).toEqual({
    export: null,
  });
  await other.close();
});

test('You › Download your data prepares a file and offers the download', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you/privacy');
  await page.getByRole('button', { name: 'Prepare my data' }).click();
  await expect(page.getByRole('link', { name: 'Download' })).toBeVisible({ timeout: 20_000 });
});
