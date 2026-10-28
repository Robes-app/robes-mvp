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

test('several pieces from one photo, reviewed one at a time (design "Add Piece")', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);

  await page.goto('/wardrobe/add');
  await expect(page.getByRole('heading', { name: 'Add pieces' })).toBeVisible();
  const back = page.getByRole('main').getByRole('link', { name: 'Wardrobe', exact: true });
  await expect(back).toBeVisible();
  await choosePhoto(page, 'Camera roll');
  await expect(page.getByRole('heading', { name: 'Here’s what Robes saw.' })).toBeVisible({
    timeout: 30_000,
  });
  // One header: the title and × beside it — no "Review" eyebrow, no back pill above it.
  await expect(page.getByText('Review', { exact: true })).toHaveCount(0);
  await expect(back).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  // Three pieces read: a strip of them, the first on the screen.
  await expect(
    page.getByRole('navigation', { name: 'Pieces to review' }).getByRole('button'),
  ).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: /^Name\s*Cream long-sleeve t-shirt/ }),
  ).toBeVisible();

  // Any row opens its drawer; her change rides the filing.
  await page.getByRole('button', { name: /^Name/ }).click();
  const name = page.getByRole('dialog', { name: 'Name' });
  await name.getByLabel('Name').fill('Cream long-sleeve tee');
  await name.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Add to wardrobe, next piece →' }).click();

  // The leggings aren't hers: Not this piece.
  await expect(page.getByRole('button', { name: /^Name\s*Black leggings/ })).toBeVisible();
  await page.getByRole('button', { name: 'Not this piece' }).click();
  // The last piece ends the read: its button says so.
  await expect(page.getByRole('button', { name: /^Name\s*White running shoes/ })).toBeVisible();
  await page.getByRole('button', { name: 'Add to wardrobe →' }).click();

  await expect(page.getByRole('heading', { name: 'Two pieces filed.' })).toBeVisible();
  await page.getByRole('link', { name: 'See your wardrobe' }).click();
  const grid = page.getByRole('list', { name: 'Pieces' });
  await expect(grid.getByRole('heading', { name: 'Cream long-sleeve tee' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'White running shoes' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Black leggings' })).toHaveCount(0);
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
  for (const next of [true, true, false]) {
    await page
      .getByRole('button', { name: next ? 'Add to wishlist, next piece →' : 'Add to wishlist →' })
      .click({ timeout: 30_000 });
  }
  await expect(page.getByRole('heading', { name: 'Three pieces filed.' })).toBeVisible();
  await page.getByRole('link', { name: 'See your wishlist' }).click();
  const wishes = page.getByRole('list', { name: 'Wishlist' });
  await expect(wishes.getByText('Black leggings')).toBeVisible();
  // Nothing reached the wardrobe.
  await page.goto('/wardrobe');
  await expect(
    page.getByRole('heading', { name: 'Every look starts with a photograph.' }),
  ).toBeVisible();
});

test('a look from a photo', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await ownShoes(page.request);

  await page.goto('/looks/new');
  await page.getByRole('link', { name: /Start from a photo/ }).click();
  await choosePhoto(page, /Add a photo/);
  const cards = page.getByRole('list', { name: 'Pieces in your photo' }).getByRole('listitem');
  await expect(cards).toHaveCount(3, { timeout: 30_000 });
  await expect(cards.nth(0)).toContainText('Not in your rack. New?');
  await expect(cards.nth(2)).toContainText('Your white running shoes?');
  await expect(page.getByText('3 pieces to confirm before you save.')).toBeVisible();
  const save = page.getByRole('button', { name: 'Save look' });
  await expect(save).toBeDisabled();

  // Yes on the match hangs her piece; Leave it out drops the tee; No, find it → it's new.
  await cards.nth(2).getByRole('button', { name: 'Yes' }).click();
  await cards.nth(0).getByRole('button', { name: 'Leave it out' }).click();
  await cards.nth(0).getByRole('button', { name: 'No, find it' }).click();
  const drawer = page.getByRole('dialog', { name: 'Find the black leggings' });
  await expect(drawer.getByRole('button', { name: 'Pick the piece it is' })).toBeDisabled();
  await drawer.getByRole('button', { name: 'None of these — it’s new' }).click();

  const rack = page.getByRole('list', { name: 'Pieces' });
  await expect(rack.getByText('New · filed on save')).toBeVisible();
  await expect(rack.getByText('White running shoes')).toBeVisible();
  await expect(page.getByText('The look · 2 pieces')).toBeVisible();
  await page.getByLabel('Name this look').fill('Sunday run');
  await page.getByLabel('Wearing it today, log it worn').check();
  await save.click();

  await expect(page).toHaveURL(/\/look\//, { timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Sunday run' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Black leggings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open White running shoes' })).toBeVisible();
  // The line under the picture names the pieces when Robes wrote no note.
  await expect(page.getByText('Black leggings and White running shoes')).toBeVisible();
  // Her photo is the look's record, and the wear is logged for today.
  const lookId = page.url().split('/look/')[1];
  const look = await (await page.request.get(`/api/v1/looks/${lookId}`)).json();
  expect(look).toMatchObject({ timesWorn: 1, name: 'Sunday run' });
  expect(look.image).not.toBeNull();
  expect(look).toMatchObject({ record: 'photo' });
});
