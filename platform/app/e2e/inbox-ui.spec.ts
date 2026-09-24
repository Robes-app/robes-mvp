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

test('paste a link from Create, then file it from the Inbox', async ({ page }) => {
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
  await page.getByRole('radio', { name: 'I want it' }).click();
  await page.getByRole('button', { name: 'Read the page' }).click();
  await expect(page.getByRole('status')).toHaveText('It’s waiting in your Inbox.', {
    timeout: 20_000,
  });
  await page.getByRole('link', { name: 'Open the Inbox' }).click();

  const inbox = page.getByRole('list', { name: 'Inbox' });
  await expect(inbox.getByText('Silk slip dress')).toBeVisible();
  await expect(inbox.getByText('From Fixture Shop')).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await inbox.getByRole('button', { name: 'Add to wishlist' }).click();
  await expect(page.getByText('Filed.')).toBeVisible();
  await expect(
    page.getByText('When Robes isn’t sure about a photo', { exact: false }),
  ).toBeVisible();

  await page.goto('/wardrobe/wishlist');
  await expect(
    page.getByRole('list', { name: 'Wishlist' }).getByText('Silk slip dress'),
  ).toBeVisible();
});
