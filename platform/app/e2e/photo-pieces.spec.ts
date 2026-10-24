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

test('several pieces to the wardrobe from one photo', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await ownShoes(page.request);

  await page.goto('/wardrobe/add');
  await page.getByRole('link', { name: /Several pieces in one photo/ }).click();
  await choosePhoto(page, /Choose a photo/);
  await expect(page.getByRole('heading', { name: 'Here’s what Robes saw.' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText(
      'Three pieces in your photo. Confirm the ones to add; each is filed on its own.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: /^Piece \d:/ })).toHaveCount(3);
  const cards = page.getByRole('list', { name: 'Pieces in your photo' }).getByRole('listitem');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Add this one?');
  await expect(cards.nth(2)).toContainText('Already yours?');
  await expect(cards.nth(2)).toContainText('White running shoes');
  const cta = page.getByRole('button', { name: 'Add to wardrobe →' });
  await expect(cta).toBeDisabled();

  await cards.nth(0).getByRole('button', { name: 'Yes' }).click();
  await expect(cards.nth(0)).toContainText('To add');
  await expect(page.getByRole('img', { name: /^Piece \d:/ })).toHaveCount(2);

  // › opens the single-piece screen scoped to that piece; "Add this piece" returns with her edit.
  await page.getByRole('button', { name: 'Open piece 2' }).click();
  await expect(page.getByText('Piece 2')).toBeVisible();
  await page.getByLabel('Name').fill('Black ribbed leggings');
  await page.getByRole('button', { name: 'Add this piece' }).click();
  await expect(cards.nth(1)).toContainText('Black ribbed leggings');

  await cards.nth(2).getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByRole('heading', { name: 'Two to add, one already yours.' })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Piece \d:/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add 2 pieces to wardrobe →' }).click();

  await expect(page.getByRole('heading', { name: 'Two pieces, filed.' })).toBeVisible();
  await expect(page.getByText('Your white running shoes kept the new photo.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to wardrobe →' }).click();
  const grid = page.getByRole('list', { name: 'Pieces' });
  await expect(grid.getByRole('heading', { name: 'Black ribbed leggings' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Cream long-sleeve t-shirt' })).toBeVisible();
});

test('a look from a photo', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await ownShoes(page.request);

  await page.goto('/looks/new');
  await page.getByRole('link', { name: /Start with a photo/ }).click();
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
  await expect(page.getByText('Black leggings')).toBeVisible();
  await expect(page.getByText('White running shoes')).toBeVisible();
  // Her photo is the look's record, and the wear is logged for today.
  const lookId = page.url().split('/look/')[1];
  const look = await (await page.request.get(`/api/v1/looks/${lookId}`)).json();
  expect(look).toMatchObject({ timesWorn: 1, name: 'Sunday run' });
  expect(look.image).not.toBeNull();
});
