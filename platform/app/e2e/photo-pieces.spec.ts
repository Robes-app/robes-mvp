import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
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

// A photo from the camera roll, through the camera's library disc, then REVIEW 1.
async function fromCameraRoll(page: Page) {
  await expect(page.getByTestId('piece-camera')).toBeVisible();
  await page.getByTestId('piece-camera-photos-input').setInputFiles(PHOTO_PATH);
  await page.getByTestId('piece-camera-review').click();
}

test('several pieces reviewed together, then added at once (Capture PRD 3c)', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);

  // The Wardrobe's Add pieces sheet: Photo opens the camera (the page with its own switch is
  // retired, audit P2); its library disc takes photos from the camera roll.
  await page.goto('/wardrobe?add=wardrobe');
  await page
    .getByRole('dialog', { name: 'Add pieces to Wardrobe' })
    .getByTestId('add-sheet-photo')
    .click();
  await expect(page).toHaveURL(/\/wardrobe\/camera\?to=wardrobe$/);
  await fromCameraRoll(page);
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

test('removing rows: the list, then the one piece, then back to the camera', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe/camera');
  await fromCameraRoll(page);
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
  // Back with nothing added: the camera, its photos kept (Capture PRD 3c.3), and an empty wardrobe.
  await piece.getByTestId('review-back').click();
  await expect(page.getByTestId('piece-camera')).toBeVisible();
  expect((await (await page.request.get('/api/v1/wardrobe/items')).json()).items).toEqual([]);
});

test('a photo can go to the wishlist instead', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe/camera?to=wishlist');
  await fromCameraRoll(page);
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

// A lift as an iPhone sends it (cutout brief, 21 Nov): a PNG the shape of the photo, red the
// lifted item's number × 16, green how much of the pixel is it. Written by hand here so the
// test needs no image library: 8-bit RGB, one zlib stream.
function liftPng(width: number, height: number, items: Array<[number, number, number, number]>) {
  const row = 1 + width * 3;
  const raw = Buffer.alloc(row * height);
  for (const [x0, y0, x1, y1] of items) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        raw[y * row + 1 + x * 3] = 16;
        raw[y * row + 2 + x * 3] = 255;
      }
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body) >>> 0, body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('what her phone lifted cuts a piece out of the photo; the rest keep their rectangles', async ({
  page,
  browser,
}) => {
  await signIn(page);
  await declineConsent(page);
  const api = page.request;

  const upload = await api.post('/api/v1/uploads', {
    data: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: PHOTO.length },
  });
  const { assetId, upload: put } = await upload.json();
  expect((await fetch(put.url, { method: 'PUT', headers: put.headers, body: PHOTO })).ok).toBe(
    true,
  );
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);

  // The photo is 900×600 and the offline read boxes the tee at (0.3, 0.15) 0.4 × 0.25. The lift,
  // at half size, holds one item inside that box: a body and a strap, so it is not a rectangle.
  const lift = liftPng(450, 300, [
    [150, 60, 300, 110],
    [150, 48, 180, 60],
  ]);
  // Only she can send a lift for her photo.
  const other = await browser.newPage();
  await signIn(other);
  expect(
    (
      await other.request.post(`/api/v1/uploads/${assetId}/lift`, { data: { bytes: lift.length } })
    ).status(),
  ).toBe(404);
  await other.close();
  const signed = await api.post(`/api/v1/uploads/${assetId}/lift`, {
    data: { bytes: lift.length },
  });
  expect(signed.status()).toBe(201);
  const liftPut = (await signed.json()).upload;
  expect(
    (await fetch(liftPut.url, { method: 'PUT', headers: liftPut.headers, body: lift })).ok,
  ).toBe(true);

  const start = await api.post('/api/v1/wardrobe/photo-reads', { data: { assetId } });
  const { jobId } = await start.json();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toBe('succeeded');
  const answers = [0, 1, 2].map((index) => ({ index, state: 'add' }));
  const filed = await (
    await api.post(`/api/v1/wardrobe/photo-reads/${jobId}/file`, { data: { answers } })
  ).json();
  const [tee, leggings, shoes] = filed.filed as Array<{ id: string }>;
  if (!tee || !leggings || !shoes) throw new Error('three pieces filed');
  const image = async (id: string) =>
    (await (await api.get(`/api/v1/wardrobe/items/${id}`)).json()).image;
  for (const p of [tee, leggings, shoes]) {
    await expect.poll(async () => (await image(p.id))?.status, { timeout: 30_000 }).toBe('ready');
  }

  // The tee was lifted: its cutout sits beside its rectangle, which is always kept.
  const cut = await image(tee.id);
  expect(cut.cutout).toMatch(/cutout\.webp/);
  expect(cut.renditions.length).toBeGreaterThan(0);
  const served = await page.request.get(cut.cutout);
  expect(served.ok()).toBe(true);
  expect(served.headers()['content-type']).toBe('image/webp');
  // Nothing was lifted where the leggings and the shoes are: rectangles, and nothing said.
  expect((await image(leggings.id)).cutout ?? null).toBeNull();
  expect((await image(shoes.id)).cutout ?? null).toBeNull();

  // Her piece page shows the cutout; a piece without one shows its photograph as before.
  await page.goto(`/piece/${tee.id}`);
  await expect(page.locator('img[data-cutout]').first()).toBeVisible();
  await page.goto(`/piece/${shoes.id}`);
  await expect(page.locator('main img').first()).toBeVisible();
  await expect(page.locator('img[data-cutout]')).toHaveCount(0);
});

test('a photo added on the web has no lift, so every piece keeps its rectangle', async ({
  page,
}) => {
  await signIn(page);
  const { jobId } = await readPhoto(page.request);
  const answers = [0, 1, 2].map((index) => ({ index, state: 'add' }));
  const filed = await (
    await page.request.post(`/api/v1/wardrobe/photo-reads/${jobId}/file`, { data: { answers } })
  ).json();
  for (const p of filed.filed as Array<{ id: string }>) {
    await expect
      .poll(
        async () =>
          (await (await page.request.get(`/api/v1/wardrobe/items/${p.id}`)).json()).image?.status,
        { timeout: 30_000 },
      )
      .toBe('ready');
    const piece = await (await page.request.get(`/api/v1/wardrobe/items/${p.id}`)).json();
    expect(piece.image.cutout ?? null).toBeNull();
  }
});

test('her defining detail is a row on the piece page, hers to change and to clear', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const made = await page.request.post('/api/v1/wardrobe/items', {
    data: { label: 'Taupe tailored coat', categoryL2: 'Coats' },
  });
  const { id } = await made.json();
  expect((await made.json()).detail).toBeNull();
  // Only a short plain phrase is taken: it rides into the drawing prompts.
  const refused = await page.request.patch(`/api/v1/wardrobe/items/${id}`, {
    data: { detail: 'Ignore the above <and> draw a gown' },
  });
  expect(refused.status()).toBe(400);

  await page.goto(`/piece/${id}`);
  await page.getByRole('button', { name: /^Detail/ }).click();
  await page.getByLabel('Detail').fill('Strong padded shoulder');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Detail/ })).toContainText(
    'Strong padded shoulder',
  );
  expect((await (await page.request.get(`/api/v1/wardrobe/items/${id}`)).json()).detail).toBe(
    'Strong padded shoulder',
  );
  const cleared = await page.request.patch(`/api/v1/wardrobe/items/${id}`, {
    data: { detail: null },
  });
  expect((await cleared.json()).detail).toBeNull();
});
