import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

let server: http.Server;
let shopUrl: string;
test.beforeAll(async () => {
  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<meta property="og:title" content="Silk slip dress"><meta property="og:site_name" content="Fixture Shop">
      <meta property="product:price:amount" content="240"><meta property="product:price:currency" content="EUR">`);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  shopUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/dress`;
});
test.afterAll(() => {
  server.closeAllConnections();
  server.close();
});
test.beforeEach(async ({ context }) => isolateClientIp(context));

test('paste a link from Create, review it, and it files to the wishlist', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.getByRole('button', { name: 'Create' }).click();
  await page
    .getByRole('dialog', { name: 'Create' })
    .getByRole('link', { name: 'Paste a link' })
    .click();
  await expect(page.getByRole('heading', { name: 'Add from a shop page.' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByLabel('Link to the piece').fill(shopUrl);
  await page.getByRole('radio', { name: 'Wishlist' }).click();
  await expect(page.getByText('Saves to your wishlist.')).toBeVisible();
  await page.getByRole('button', { name: 'Read the page' }).click();

  // The page is read, then reviewed like a photo before anything files (design "Add Piece").
  await expect(page.getByRole('heading', { name: 'Here’s what Robes saw.' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: /^Name\s*Silk slip dress/ })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Add to wishlist →' }).click();
  await expect(page.getByRole('heading', { name: 'One piece filed.' })).toBeVisible();
  await page.getByRole('link', { name: 'See your wishlist' }).click();
  await expect(
    page.getByRole('list', { name: 'Wishlist' }).getByText('Silk slip dress'),
  ).toBeVisible();

  // Filed, it has left the Inbox.
  await page.goto('/wardrobe/inbox');
  await expect(page.getByText('Silk slip dress')).toHaveCount(0);
});
