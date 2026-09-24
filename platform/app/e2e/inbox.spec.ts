import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

// A shop page served by the test itself (the e2e server runs with the dev-only
// ALLOW_PRIVATE_FETCH escape hatch; the SEC-40 refusals are unit-tested in @robes/jobs).
let server: http.Server;
let shopUrl: string;
test.beforeAll(async () => {
  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<html><head><title>Coat | Fixture Shop</title>
      <meta property="og:site_name" content="Fixture Shop">
      <script type="application/ld+json">{"@type":"Product","name":"Double-faced wool coat",
        "brand":{"name":"Toteme"},"offers":{"price":"650","priceCurrency":"EUR"}}</script></head></html>`);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  shopUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/p/coat`;
});
test.afterAll(() => {
  server.closeAllConnections();
  server.close();
});
test.beforeEach(async ({ context }) => isolateClientIp(context));

test('a pasted link lands in the Inbox and files into the wardrobe once', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const api = page.request;
  const started = await api.post('/api/v1/imports/link', {
    data: { url: shopUrl, as: 'wardrobe' },
  });
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 20_000,
    })
    .toBe('succeeded');

  const inbox = await (await api.get('/api/v1/inbox')).json();
  expect(inbox.count).toBe(1);
  const [entry] = inbox.items;
  expect(entry).toMatchObject({ source: 'link', retailer: 'Fixture Shop' });
  expect(entry.items[0]).toMatchObject({
    label: 'Double-faced wool coat',
    brand: 'Toteme',
    price: 650,
    currency: 'EUR',
  });
  expect(JSON.stringify(entry)).not.toContain('imageUrl');
  expect((await (await api.get('/api/v1/today')).json()).inboxCount).toBe(1);

  // Someone else can't see or decide it.
  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  expect((await (await otherPage.request.get('/api/v1/inbox')).json()).items).toEqual([]);
  const stolen = await otherPage.request.post(`/api/v1/inbox/${entry.id}/decide`, {
    data: { action: 'wardrobe' },
  });
  expect(stolen.status()).toBe(404);
  await other.close();

  const decided = await (
    await api.post(`/api/v1/inbox/${entry.id}/decide`, { data: { action: 'wardrobe' } })
  ).json();
  expect(decided).toMatchObject({ status: 'filed', filedTo: 'wardrobe' });
  const again = await (
    await api.post(`/api/v1/inbox/${entry.id}/decide`, { data: { action: 'wishlist' } })
  ).json();
  expect(again.filedIds).toEqual(decided.filedIds);
  const piece = await (await api.get(`/api/v1/wardrobe/items/${decided.filedIds[0]}`)).json();
  expect(piece).toMatchObject({ label: 'Double-faced wool coat', brand: 'Toteme' });
  expect((await (await api.get('/api/v1/inbox')).json()).count).toBe(0);
});

test('non-web links are refused before anything is fetched', async ({ page }) => {
  await signIn(page);
  for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'ftp://shop.example/x']) {
    expect((await page.request.post('/api/v1/imports/link', { data: { url } })).status()).toBe(400);
  }
});
