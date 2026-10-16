import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('a wish is kept, edited, undone and bought into the wardrobe', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const created = await api.post('/api/v1/wishlist/items', {
    data: { label: 'Trench coat', categoryL2: 'coats', sourceUrl: 'https://shop.test/trench' },
  });
  expect(created.status()).toBe(201);
  const wish = await created.json();
  expect(wish).toMatchObject({ category: 'Outerwear', sourceUrl: 'https://shop.test/trench' });

  const url = `/api/v1/wishlist/items/${wish.id}`;
  expect((await (await api.patch(url, { data: { brand: 'Burberry' } })).json()).brand).toBe(
    'Burberry',
  );
  expect((await api.delete(url)).ok()).toBe(true);
  expect((await api.get(url)).status()).toBe(404);
  expect((await api.post(`${url}/restore`)).ok()).toBe(true);

  const bought = await api.post(`${url}/promote`);
  expect(bought.status()).toBe(201);
  const piece = await bought.json();
  expect(piece).toMatchObject({ label: 'Trench coat', brand: 'Burberry', category: 'Outerwear' });
  expect((await api.post(`${url}/promote`)).status()).toBe(404);
  const { items } = await (await api.get('/api/v1/wishlist/items')).json();
  expect(items.map((w: { id: string }) => w.id)).not.toContain(wish.id);
  expect((await api.get(`/api/v1/wardrobe/items/${piece.id}`)).ok()).toBe(true);
});

test('wish links must be http(s) and wishes are private', async ({ page, browser }) => {
  await signIn(page);
  const bad = await page.request.post('/api/v1/wishlist/items', {
    data: { label: 'Shoes', sourceUrl: 'javascript:alert(1)' },
  });
  expect(bad.status()).toBe(400);
  const wish = await (
    await page.request.post('/api/v1/wishlist/items', { data: { label: 'Private boots' } })
  ).json();
  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const url = `/api/v1/wishlist/items/${wish.id}`;
  expect((await otherPage.request.get(url)).status()).toBe(404);
  expect((await otherPage.request.post(`${url}/promote`)).status()).toBe(404);
  expect((await otherPage.request.delete(url)).status()).toBe(404);
  await other.close();
});
