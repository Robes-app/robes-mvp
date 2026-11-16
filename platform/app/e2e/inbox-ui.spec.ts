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

// The desktop bar's Create is retired (Annie, 15 Nov): Add pieces is the way in.
test('paste a link from Add pieces, review it, and it files to the wishlist', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  // The old Add pieces address opens the Add pieces sheet over the Wardrobe (audit P2).
  await page.goto('/wardrobe/add');
  await expect(page).toHaveURL(/\/wardrobe\?add=wardrobe$/);
  await expect(page.getByRole('dialog', { name: 'Add pieces to Wardrobe' })).toBeVisible();
  await page.goto('/wardrobe/link?to=wardrobe');
  await expect(page.getByRole('heading', { name: 'Add from a shop page.' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  // Where it goes was chosen on the Add pieces sheet; the link screen says so (redline 04), and
  // Change toggles it in place, as on the iPhone.
  await expect(page.getByText(/Filing to your wardrobe/)).toBeVisible();
  await page.getByRole('link', { name: 'Change' }).click();
  await expect(page.getByText(/Filing to your wishlist/)).toBeVisible();
  await page.getByLabel('Link to the piece').fill(shopUrl);
  await page.getByRole('button', { name: 'Read the page' }).click();

  // The page is read, then reviewed like a photo before anything files (design "Add Piece").
  await expect(page.getByRole('heading', { name: 'Review piece' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: /^Name\s*Silk slip dress/ })).toBeVisible({
    timeout: 20_000,
  });
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByTestId('review-add').click();
  await expect(page).toHaveURL(/\/wardrobe\/wishlist/, { timeout: 15_000 });
  await expect(page.getByText('1 piece added to your wishlist', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Wishlist' }).getByText('Silk slip dress'),
  ).toBeVisible();

  // Filed, it has left the Inbox.
  await page.goto('/wardrobe/inbox');
  await expect(page.getByText('Silk slip dress')).toHaveCount(0);
});
