import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

// A piece filed from a photo the quick way (the home's file-photo door uses the batch): Add
// pieces' Review is walked in photo-pieces.spec.
async function filePhoto(api: APIRequestContext): Promise<void> {
  const bytes = readFileSync(PHOTO);
  const upload = await api.post('/api/v1/uploads', {
    data: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: bytes.length },
  });
  const { assetId, upload: put } = await upload.json();
  expect((await fetch(put.url, { method: 'PUT', headers: put.headers, body: bytes })).ok).toBe(
    true,
  );
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);
  const batch = await api.post('/api/v1/wardrobe/items/batch', { data: { assetIds: [assetId] } });
  expect(batch.status()).toBe(202);
}

test.beforeEach(({ context }) => isolateClientIp(context));

test('photos become pieces she can edit, remove and undo', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe');
  await expect(
    page.getByRole('heading', { name: 'Every look starts with a photograph.' }),
  ).toBeVisible();

  await filePhoto(page.request);
  await page.reload();
  const pieces = page.getByRole('list', { name: 'Pieces' });
  // Read by the offline fake: the piece fills in without a reload.
  await expect(pieces.getByRole('heading', { name: 'Camel wool coat' })).toBeVisible({
    timeout: 30_000,
  });

  await pieces.getByRole('link', { name: /Camel wool coat/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Camel wool coat' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Photo of Camel wool coat' })).toBeVisible();
  // Change photo sits on the photograph (legacy rb-pc-rephoto): a pick uploads and replaces it.
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
  const changed = page.waitForResponse(
    (r) => /\/wardrobe\/items\/[^/]+\/photo$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.locator('input[type="file"][aria-label="Change photo"]').setInputFiles(PHOTO);
  expect((await changed).status()).toBe(200);
  await expect(page.getByRole('img', { name: 'Photo of Camel wool coat' })).toBeVisible();
  // Every fact is a row that opens its own drawer, and the line under the name is the truth:
  // a brand she adds shows there at once, with no form to save.
  await page.getByRole('button', { name: 'Add the brand' }).click();
  const brand = page.getByRole('dialog', { name: 'Brand' });
  await brand.getByLabel('Brand').fill('Harbour');
  await brand.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Harbour', exact: true })).toBeVisible();

  // Category drills Category › Subcategory › Item type, from wardrobe_taxonomy.
  await page.getByRole('button', { name: /^Category/ }).click();
  // The sheet opens where the piece already sits (Outerwear › Coats): the level is the title, the
  // family its eyebrow, and the back chevron steps out a level at a time.
  const cat = page.getByRole('dialog', { name: 'Coats' });
  await cat.getByRole('button', { name: 'Back to Outerwear' }).click();
  await page
    .getByRole('dialog', { name: 'Outerwear' })
    .getByRole('button', { name: 'Back to Category' })
    .click();
  const top = page.getByRole('dialog', { name: 'Category' });
  await top.getByRole('button', { name: 'Tops', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Tops' })
    .getByRole('button', { name: 'T-shirts & tees' })
    .click();
  // A pick saves and closes the sheet (the record's rows, no form to save); the row reads the leaf.
  await page
    .getByRole('dialog', { name: 'T-shirts & tees' })
    .getByRole('button', { name: 'Crew neck t-shirt' })
    .click();
  await expect(page.getByRole('button', { name: /^Category.*Crew neck t-shirt/ })).toBeVisible();

  // What she wears it for is a styling signal, so it is hers to set and reads back on the row.
  await page.getByRole('button', { name: /^Wear it for/ }).click();
  const wear = page.getByRole('dialog', { name: 'Wear it for' });
  await wear.getByRole('button', { name: 'Work', exact: true }).click();
  await wear.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /Wear it for.*Work/ })).toBeVisible();

  // Material is the fourth row of Colour & material: the read files Wool, a pick from another
  // family answers it, and "Not sure" files nothing.
  await expect(page.getByRole('button', { name: /^Material.*Wool/ })).toBeVisible();
  await page.getByRole('button', { name: /^Material/ }).click();
  const fabric = page.getByRole('dialog', { name: 'Material' });
  await expect(fabric.getByRole('radio', { name: /Wool/ })).toHaveAttribute('aria-checked', 'true');
  await fabric.getByRole('button', { name: 'Cloths', exact: true }).click();
  await fabric.getByRole('radio', { name: /Denim/ }).click();
  await expect(page.getByRole('button', { name: /^Material.*Denim/ })).toBeVisible();
  await page.getByRole('button', { name: /^Material/ }).click();
  await page
    .getByRole('dialog', { name: 'Material' })
    .getByRole('button', { name: 'Not sure' })
    .click();
  await expect(page.getByRole('button', { name: /^Material.*Optional/ })).toBeVisible();

  // The pencil edits the name where it is written; Save waits until the name has changed.
  await page.getByRole('button', { name: 'Edit the name' }).click();
  const name = page.getByRole('dialog', { name: 'Name' });
  await name.getByLabel('Name').fill('Camel wool coat');
  await expect(name.getByRole('button', { name: 'Save' })).toBeDisabled();
  await name.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Camel wool coat' })).toBeVisible();

  await page.getByRole('link', { name: 'Wardrobe' }).first().click();
  // The web opens on the grid; the count row counts and the star files it to the Hero Rack.
  await expect(page.getByText('1 piece', { exact: true })).toBeVisible();
  await expect(pieces.getByText('Never worn')).toBeVisible();
  await pieces.getByRole('button', { name: 'Feature Camel wool coat in your Hero Rack' }).click();
  await expect(page.getByText('Saved to your Hero Rack.').first()).toBeVisible();
  await expect(
    pieces.getByRole('button', { name: 'Remove Camel wool coat from your Hero Rack' }),
  ).toHaveAttribute('aria-pressed', 'true');
  // The list is the rack card; its row swipes (or tabs) to Remove.
  await page.getByRole('radio', { name: 'List', exact: true }).click();
  // Re-filed above as a crew neck tee, so the card's eyebrow reads Tops now.
  await expect(pieces.getByText('Tops · Harbour')).toBeVisible();
  // A drag to the left past the threshold lets it go (legacy swipe, with a mouse here).
  const row = pieces.getByRole('heading', { name: 'Camel wool coat' });
  const box = await row.boundingBox();
  if (!box) throw new Error('no row');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (const dx of [20, 60, 120, 200]) {
    await page.mouse.move(box.x + box.width / 2 - dx, box.y + box.height / 2);
  }
  await page.mouse.up();
  await expect(pieces).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    page.getByRole('list', { name: 'Pieces' }).getByRole('heading', { name: 'Camel wool coat' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Harbour')).toBeVisible();
});

test('a wish becomes a piece when she buys it, and removal can be undone', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe/wishlist');
  await expect(page.getByRole('heading', { name: 'Pieces you’re after live here.' })).toBeVisible();
  // Wishes arrive through Add pieces now (walked in inbox-ui / photo-pieces); seed them directly.
  for (const label of ['Black leather loafers', 'Silk scarf']) {
    const created = await page.request.post('/api/v1/wishlist/items', { data: { label } });
    expect(created.status()).toBe(201);
  }
  await page.reload();
  const wishes = page.getByRole('list', { name: 'Wishlist' });
  for (const label of ['Black leather loafers', 'Silk scarf']) {
    await expect(wishes.getByText(label)).toBeVisible();
  }
  await expect(page.getByText('2 wishlisted')).toBeVisible();
  await expect(wishes.getByText('Not yours yet').first()).toBeVisible();
  await page.getByRole('radio', { name: 'List', exact: true }).click();

  // Keyboard: tabbing to Remove slides the row open; Enter lets it go.
  await wishes.getByRole('button', { name: 'Remove Silk scarf' }).focus();
  await page.keyboard.press('Enter');
  await expect(wishes.getByText('Silk scarf')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(wishes.getByText('Silk scarf')).toBeVisible();

  await wishes
    .getByRole('listitem')
    .filter({ hasText: 'Black leather loafers' })
    .getByRole('button', { name: 'I bought Black leather loafers' })
    .click();
  await expect(
    page.getByText('Black leather loafers is in your wardrobe now.', { exact: true }),
  ).toBeVisible();
  await expect(wishes.getByText('Black leather loafers')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Wardrobe' }).click();
  await expect(
    page
      .getByRole('list', { name: 'Pieces' })
      .getByRole('heading', { name: 'Black leather loafers' }),
  ).toBeVisible();
});
