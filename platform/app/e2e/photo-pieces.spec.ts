import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

// Several pieces from one photograph (legacy 2026-10-13), read by the offline fake: a cream
// tee and black leggings she doesn't own, and white running shoes matched to the pair she has.
const PHOTO_PATH = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));
const PHOTO = readFileSync(PHOTO_PATH);

test.beforeEach(async ({ context }) => isolateClientIp(context));

async function ownShoes(api: APIRequestContext): Promise<string> {
  const res = await api.post('/api/v1/wardrobe/items', {
    data: { label: 'White running shoes', categoryL2: 'Trainers', categoryL3: 'Running shoe' },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id;
}

async function readPhoto(api: APIRequestContext, kind = 'wardrobe') {
  const upload = await api.post('/api/v1/uploads', {
    data: { kind, contentType: 'image/jpeg', bytes: PHOTO.length },
  });
  const { assetId, upload: put } = await upload.json();
  expect((await fetch(put.url, { method: 'PUT', headers: put.headers, body: PHOTO })).ok).toBe(
    true,
  );
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);
  const start = await api.post('/api/v1/wardrobe/photo-reads', { data: { assetId } });
  expect(start.status()).toBe(202);
  const { jobId } = await start.json();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toBe('succeeded');
  const job = await (await api.get(`/api/v1/jobs/${jobId}`)).json();
  return { assetId, jobId, pieces: job.output.readPieces as Array<Record<string, unknown>> };
}

test('a photo read files each answered piece once, and only for her', async ({ page, browser }) => {
  await signIn(page);
  const api = page.request;
  const shoes = await ownShoes(api);
  const { jobId, pieces } = await readPhoto(api);
  expect(pieces.map((p) => p.label)).toEqual([
    'Cream long-sleeve t-shirt',
    'Black leggings',
    'White running shoes',
  ]);
  expect(pieces[2]).toMatchObject({ match: { pieceId: shoes, confidence: 0.8 } });
  expect(pieces[0]).not.toHaveProperty('itemDna');
  // The read carries the colour model and the material (wardrobe.pieces v2)…
  expect(pieces[0]).toMatchObject({ colourShade: 'cream', print: null, material: 'cotton' });

  const fileUrl = `/api/v1/wardrobe/photo-reads/${jobId}/file`;
  // Nothing is filed on Robes' word alone: every piece needs an answer.
  expect(
    (await api.post(fileUrl, { data: { answers: [{ index: 0, state: 'add' }] } })).status(),
  ).toBe(400);
  const answers = [
    { index: 0, state: 'add' },
    { index: 1, state: 'skip' },
    { index: 2, state: 'owned', pieceId: shoes },
  ];
  const filed = await (await api.post(fileUrl, { data: { answers } })).json();
  expect(filed.filed.map((p: { label: string }) => p.label)).toEqual(['Cream long-sleeve t-shirt']);
  expect(filed.photoAdded).toEqual([shoes]);
  // …and filing keeps them, with the category's season (apply_tag_defaults).
  expect(filed.filed[0]).toMatchObject({
    colourShade: 'cream',
    material: 'cotton',
    seasonBand: 'year_round',
  });
  // Each piece's photo is its own crop, cut and rendered by the rendition pipeline.
  for (const id of [filed.filed[0].id, shoes]) {
    await expect
      .poll(
        async () => (await (await api.get(`/api/v1/wardrobe/items/${id}`)).json()).image?.status,
        {
          timeout: 30_000,
        },
      )
      .toBe('ready');
  }
  const again = await (await api.post(fileUrl, { data: { answers } })).json();
  expect(again.filed[0].id).toBe(filed.filed[0].id);
  expect(again.photoAdded).toEqual([]);

  // Another account can't see or answer her read.
  const other = await browser.newPage();
  await signIn(other);
  expect((await other.request.get(`/api/v1/jobs/${jobId}`)).status()).toBe(404);
  expect((await other.request.post(fileUrl, { data: { answers } })).status()).toBe(404);
  await other.close();
});

async function choosePhoto(page: Page, label: RegExp | string) {
  await page.getByLabel(label).setInputFiles(PHOTO_PATH);
}

test('several pieces reviewed together, then added at once (Capture PRD 3c)', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);

  await page.goto('/wardrobe/add');
  await expect(page.getByRole('heading', { name: 'Add pieces' })).toBeVisible();
  await choosePhoto(page, 'Camera roll');
  // The list: one row per piece Robes found, under "3 pieces".
  const list = page.getByTestId('review-list');
  await expect(list.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  const rows = list.getByTestId('review-row');
  await expect(rows).toHaveCount(3, { timeout: 30_000 });
  await expect(list.getByRole('heading', { name: '3 pieces' })).toBeVisible();
  await expect(
    list.getByText('Tap a piece to check its details. Remove anything that shouldn’t be here.'),
  ).toBeVisible();
  const add = page.getByTestId('review-add');
  await expect(add).toHaveText(/Add 3 to wardrobe/i);

  // A row opens the piece: "Piece 1 of 3", its rows hers to change, Done back to the list.
  await rows.nth(0).getByRole('button', { name: 'Check Cream long-sleeve t-shirt' }).click();
  const piece = page.getByTestId('review-piece');
  await expect(piece.getByRole('heading', { name: 'Piece 1 of 3' })).toBeVisible();
  await expect(
    piece.getByText('Seasons and what you wear it for live on the piece’s Wearing tab.'),
  ).toBeVisible();
  await piece.getByRole('button', { name: /^Name/ }).click();
  const name = page.getByRole('dialog', { name: 'Name' });
  await name.getByLabel('Name').fill('Cream long-sleeve tee');
  await name.getByRole('button', { name: 'Save' }).click();
  await piece.getByTestId('review-done').click();
  // Her edit is on the list.
  await expect(rows.nth(0)).toContainText('Cream long-sleeve tee');

  // The leggings aren't hers: × takes the row off, and the count follows.
  await rows.nth(1).getByRole('button', { name: 'Remove Black leggings' }).click();
  await expect(rows).toHaveCount(2);
  await expect(add).toHaveText(/Add 2 to wardrobe/i);
  await add.click();

  // The wardrobe opens on them under the toast; nothing asked in between.
  await expect(page).toHaveURL(/\/wardrobe$/, { timeout: 15_000 });
  await expect(page.getByText('2 pieces added to your wardrobe', { exact: true })).toBeVisible();
  const grid = page.getByRole('list', { name: 'Pieces' });
  await expect(grid.getByRole('heading', { name: 'Cream long-sleeve tee' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'White running shoes' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Black leggings' })).toHaveCount(0);
});

test('removing rows: the list, then the one piece, then back to Add pieces', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe/add');
  await choosePhoto(page, 'Camera roll');
  const rows = page.getByTestId('review-row');
  await expect(rows).toHaveCount(3, { timeout: 30_000 });
  await rows
    .nth(0)
    .getByRole('button', { name: /^Remove / })
    .click();
  await rows
    .nth(0)
    .getByRole('button', { name: /^Remove / })
    .click();
  // One left: its own page, with the one button to add it.
  const piece = page.getByTestId('review-piece');
  await expect(piece.getByRole('heading', { name: 'Review piece' })).toBeVisible();
  await expect(piece.getByRole('button', { name: /^Name\s*White running shoes/ })).toBeVisible();
  await expect(page.getByTestId('review-add')).toHaveText(/^Add to wardrobe$/i);
  // Back with nothing added: the Add pieces sheet, and an empty wardrobe.
  await piece.getByTestId('review-back').click();
  await expect(page.getByRole('heading', { name: 'Add pieces' })).toBeVisible();
  expect((await (await page.request.get('/api/v1/wardrobe/items')).json()).items).toEqual([]);
});

test('a photo can go to the wishlist instead', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe/add?to=wishlist');
  await expect(page.getByRole('radio', { name: 'Wishlist' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await choosePhoto(page, 'Camera roll');
  await expect(page.getByTestId('review-row')).toHaveCount(3, { timeout: 30_000 });
  await expect(page.getByTestId('review-add')).toHaveText(/Add 3 to wishlist/i);
  await page.getByTestId('review-add').click();
  await expect(page).toHaveURL(/\/wardrobe\/wishlist/, { timeout: 15_000 });
  await expect(page.getByText('3 pieces added to your wishlist', { exact: true })).toBeVisible();
  const wishes = page.getByRole('list', { name: 'Wishlist' });
  await expect(wishes.getByText('Black leggings')).toBeVisible();
  // Nothing reached the wardrobe.
  await page.goto('/wardrobe');
  await expect(page.getByRole('heading', { name: 'Your wardrobe is empty' })).toBeVisible();
});
