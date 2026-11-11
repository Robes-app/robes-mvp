import { fileURLToPath } from 'node:url';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

// Capture a look (Capture PRD 1c, 10 Nov 2026; canvas frame 1c). The offline fake reads the
// fixture as a cream tee and black leggings she doesn't own, and white running shoes matched to
// the pair she has. The test browser has no camera, which is the PRD's "camera denied" path: her
// photos still work.
const PHOTO_PATH = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(async ({ context }) => isolateClientIp(context));

async function ownShoes(api: APIRequestContext): Promise<string> {
  const res = await api.post('/api/v1/wardrobe/items', {
    data: { label: 'White running shoes', categoryL2: 'Trainers', categoryL3: 'Running shoe' },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id;
}

test('capture → use photo → save: the look is in the Lookbook and on today, nothing typed', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);

  await page
    .getByTestId('add-page')
    .getByRole('button', { name: 'Photograph a look for today' })
    .click();
  const camera = page.getByTestId('capture-camera');
  await expect(camera.getByText('Step back from the mirror · Head to toe')).toBeVisible();
  // Camera denied: the line says how to allow it, and her photos are a tap away.
  await expect(camera.getByRole('alert')).toContainText('Allow the camera');
  await expect(camera.getByRole('button', { name: 'Take photo' })).toBeDisabled();
  await page.getByTestId('capture-photos-input').setInputFiles(PHOTO_PATH);

  const review = page.getByTestId('capture-review');
  await expect(review.getByText('Whole outfit in frame?')).toBeVisible();
  // Retake and Back both return to the viewfinder.
  await review.getByRole('button', { name: 'Retake' }).click();
  await expect(camera).toBeVisible();
  await page.getByTestId('capture-photos-input').setInputFiles(PHOTO_PATH);
  await review.getByRole('button', { name: 'Use photo' }).click();

  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}\?day=/, { timeout: 20_000 });
  const drawer = page.getByTestId('draft-look');
  const rack = drawer.getByTestId('capture-rack');
  await expect(rack).toHaveAttribute('data-stage', 'ask');
  await expect(rack.getByRole('button', { name: 'Find the pieces' })).toBeVisible();
  // A draft from her photograph is the photograph and its rack: no prompt card, no Generate.
  await expect(drawer.getByTestId('draft-prompt')).toHaveCount(0);
  await expect(drawer.getByTestId('draft-generate')).toHaveCount(0);

  // Skip, keep just the photo: the same card, optional now; Save stands ready.
  await rack.getByRole('button', { name: 'Skip, keep just the photo' }).click();
  await expect(rack).toHaveAttribute('data-stage', 'photo');
  await expect(rack.getByText('Optional · you can do this later')).toBeVisible();
  await expect(drawer.getByTestId('draft-done')).toHaveAttribute('aria-disabled', 'false');
  await drawer.getByTestId('draft-done').click();

  await expect(page).toHaveURL(/\/\?day=.*&saved=/, { timeout: 15_000 });
  const id = new URL(page.url()).searchParams.get('saved');
  const look = await (await page.request.get(`/api/v1/looks/${id}`)).json();
  expect(look).toMatchObject({ status: 'saved', source: 'capture', record: 'photo', pieces: [] });
  expect(look.photo).not.toBeNull();
  expect(look.pinnedOn).toHaveLength(1);
  // The Lookbook holds it.
  const saved = await (await page.request.get('/api/v1/looks?status=saved')).json();
  expect(saved.items.map((l: { id: string }) => l.id)).toContain(id);
});

test('the rack: find the pieces, match in one tap, add one, remove one, save with one unfiled', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const shoes = await ownShoes(page.request);

  await page
    .getByTestId('add-page')
    .getByRole('button', { name: 'Photograph a look for today' })
    .click();
  await page.getByTestId('capture-photos-input').setInputFiles(PHOTO_PATH);
  await page.getByTestId('capture-review').getByRole('button', { name: 'Use photo' }).click();
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}\?day=/, { timeout: 20_000 });
  const drawer = page.getByTestId('draft-look');
  const rack = drawer.getByTestId('capture-rack');

  await rack.getByRole('button', { name: 'Find the pieces' }).click();
  const found = rack.locator('[data-testid^="capture-row-"]');
  await expect(found).toHaveCount(3, { timeout: 30_000 });
  await expect(rack).toHaveAttribute('data-stage', 'rack');
  await expect(drawer.getByTestId('draft-done')).toHaveAttribute('aria-disabled', 'false');
  // No close match on the tee; the shoes look like hers.
  await expect(found.nth(0)).toContainText('No close match in your wardrobe');
  await expect(found.nth(2)).toContainText('Looks like your');
  await expect(found.nth(2)).toContainText('White running shoes');

  // One tap on the suggestion files the row as her piece: it opens the piece and shows its wears.
  await found.nth(2).getByRole('button', { name: 'Match', exact: true }).click();
  await expect(rack.getByRole('link', { name: 'Open White running shoes' })).toBeVisible();
  await expect(found).toHaveCount(2);

  // Remove hides the row behind Undo; Undo puts it back.
  await found.nth(0).getByRole('button', { name: 'Remove' }).click();
  await expect(rack.getByText('1 piece removed')).toBeVisible();
  await expect(found).toHaveCount(1);
  await rack.getByRole('button', { name: 'Undo' }).click();
  await expect(found).toHaveCount(2);

  // Match to piece opens her wardrobe under the row's category; nothing ticked, nothing to match.
  await found.nth(0).getByRole('button', { name: 'Match to piece' }).click();
  const picker = page.getByTestId('piece-picker');
  await expect(picker.getByText('Match to your wardrobe')).toBeVisible();
  await expect(picker.getByTestId('picker-confirm')).toHaveText(/Match piece/i);
  await expect(picker.getByTestId('picker-confirm')).toBeDisabled();
  await picker.getByRole('button', { name: 'Back' }).click();

  // Add piece: the found piece on its own page, Robes' read in the rows, filed with one tap.
  await found.nth(1).getByRole('button', { name: 'Add piece' }).click();
  const sheet = page.getByTestId('capture-new-piece');
  await expect(sheet.getByRole('tab', { name: 'Colour' })).toBeVisible();
  await sheet.getByTestId('capture-add-to-wardrobe').click();
  await expect(sheet).toHaveCount(0, { timeout: 15_000 });
  await expect(found).toHaveCount(1);
  const wardrobe = await (await page.request.get('/api/v1/wardrobe/items')).json();
  expect(wardrobe.items).toHaveLength(2);
  expect(wardrobe.items.map((p: { id: string }) => p.id)).toContain(shoes);

  // Save with the tee still unfiled: it stays on the look as a suggestion, never in her wardrobe
  // or on her wishlist.
  await drawer.getByTestId('draft-done').click();
  await expect(page).toHaveURL(/\/\?day=.*&saved=/, { timeout: 15_000 });
  const id = new URL(page.url()).searchParams.get('saved');
  const look = await (await page.request.get(`/api/v1/looks/${id}`)).json();
  expect(look).toMatchObject({ status: 'saved', source: 'capture', composedByRobes: false });
  expect(look.pieces).toHaveLength(2);
  expect(look.proposals).toHaveLength(1);
  expect(look.proposals[0].capture).toMatchObject({ index: 0 });
  expect(Object.keys(look.captureImages)).toEqual([look.proposals[0].key]);
  expect((await (await page.request.get('/api/v1/wardrobe/items')).json()).items).toHaveLength(2);
  expect((await (await page.request.get('/api/v1/wishlist/items')).json()).items).toHaveLength(0);
});

test('a draft from a photograph she never touched closes without a question', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page
    .getByTestId('add-page')
    .getByRole('button', { name: 'Photograph a look for today' })
    .click();
  // Close on the viewfinder: back on Home, nothing made.
  await page.getByTestId('capture-close').click();
  await expect(page.getByTestId('capture-camera')).toHaveCount(0);
  expect((await (await page.request.get('/api/v1/looks?status=draft')).json()).items).toEqual([]);

  await page
    .getByTestId('add-page')
    .getByRole('button', { name: 'Photograph a look for today' })
    .click();
  await page.getByTestId('capture-photos-input').setInputFiles(PHOTO_PATH);
  await page.getByTestId('capture-review').getByRole('button', { name: 'Use photo' }).click();
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}\?day=/, { timeout: 20_000 });
  await page.getByTestId('draft-look').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/\?day=/);
  await expect
    .poll(async () => (await (await page.request.get('/api/v1/looks?status=draft')).json()).items)
    .toEqual([]);
});

test('a draft from her photograph, its read and its pieces are hers alone', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const api = page.request;
  const { readFileSync } = await import('node:fs');
  const photo = readFileSync(PHOTO_PATH);
  const upload = await api.post('/api/v1/uploads', {
    data: { kind: 'look_photo', contentType: 'image/jpeg', bytes: photo.length },
  });
  const { assetId, upload: put } = await upload.json();
  expect((await fetch(put.url, { method: 'PUT', headers: put.headers, body: photo })).ok).toBe(
    true,
  );
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);

  const created = await api.post('/api/v1/looks', {
    data: { status: 'draft', pieces: [], photoAssetId: assetId },
  });
  expect(created.status()).toBe(201);
  const look = await created.json();
  expect(look).toMatchObject({ status: 'draft', source: 'capture', record: 'photo' });
  expect(look.images).toHaveLength(1);

  const start = await api.post(`/api/v1/looks/${look.id}/pieces/find`, { data: {} });
  expect(start.status()).toBe(202);
  const { jobId } = await start.json();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toBe('succeeded');

  // One piece files once, by itself; asking again returns the same piece.
  const pieceUrl = `/api/v1/wardrobe/photo-reads/${jobId}/pieces`;
  const first = await api.post(pieceUrl, { data: { index: 1, edits: { label: 'Gym leggings' } } });
  expect(first.status()).toBe(200);
  const again = await api.post(pieceUrl, { data: { index: 1 } });
  expect((await again.json()).id).toBe((await first.json()).id);
  expect((await (await api.get('/api/v1/wardrobe/items')).json()).items).toHaveLength(1);
  expect((await api.post(pieceUrl, { data: { index: 7 } })).status()).toBe(404);

  // Another account can make nothing of her photograph, her look or her read.
  const other = await browser.newPage();
  await signIn(other);
  expect(
    (
      await other.request.post('/api/v1/looks', {
        data: { status: 'draft', pieces: [], photoAssetId: assetId },
      })
    ).status(),
  ).toBe(404);
  expect(
    (await other.request.post(`/api/v1/looks/${look.id}/pieces/find`, { data: {} })).status(),
  ).toBe(404);
  expect((await other.request.post(pieceUrl, { data: { index: 0 } })).status()).toBe(404);
  await other.close();
});
