import { expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

async function makePieces(page: Page, labels: string[]): Promise<void> {
  for (const label of labels) {
    const res = await page.request.post('/api/v1/wardrobe/items', { data: { label } });
    expect(res.status()).toBe(201);
  }
}

test('compose a look, wear it today with undo, plan it, then unpin and undo', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await makePieces(page, ['Camel coat', 'Straight jeans']);

  // Create › New look is the composer now.
  await page.getByRole('button', { name: 'Create' }).first().click();
  await page
    .getByRole('dialog', { name: 'Create' })
    .getByRole('link', { name: 'New look' })
    .click();
  await expect(page).toHaveURL(/\/looks\/new$/);
  // The first piece makes it a draft; the second joins its rack; Save keeps it.
  await page.getByRole('button', { name: '+ Add a piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Camel coat' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Draft look')).toBeVisible();
  await page.getByRole('button', { name: '+ Add a piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Straight jeans' }).click();
  await expect(page.getByText('2 pieces', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved to your lookbook', { exact: true })).toBeVisible();

  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Camel coat, styled' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep this name' }).click();
  await expect(page.getByText('Robes’ suggestion')).toBeHidden();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Wear it today' }).click();
  await expect(page.getByText('Worn today.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  const lookId = page.url().split('/').at(-1) ?? '';
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/looks/${lookId}`)).json()).timesWorn)
    .toBe(0);

  const tomorrow = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await page.getByLabel('Wear on a day').fill(tomorrow);
  await page.getByRole('button', { name: 'Add to Plan' }).click();
  await expect(page.getByText('Added to Plan.', { exact: true })).toBeVisible();

  // The plan lists summary rows; the row opens the day page, where the day is named and edited.
  await page.goto('/plan');
  await page.getByRole('link', { name: /Camel coat, styled$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${tomorrow}$`));
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Rename the day' }).click();
  await page.getByLabel('The day’s name').fill('Gallery opening');
  await page.getByLabel('The day’s name').press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery opening' })).toBeVisible();
  await expect
    .poll(async () => {
      const plan = await (await page.request.get(`/api/v1/plan?from=${tomorrow}&days=1`)).json();
      return plan.days[0].entries[0]?.activity;
    })
    .toBe('Gallery opening');

  await page.getByRole('button', { name: 'Take Camel coat, styled off the day' }).click();
  await expect(page.getByRole('link', { name: /Camel coat, styled/ })).toBeHidden();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('link', { name: /Camel coat, styled/ })).toBeVisible();

  await page.goto('/looks');
  await expect(page.getByRole('link', { name: 'Camel coat, styled' })).toBeVisible();
});

test('a look can be shared and the link turned off', async ({ page, context, browser }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signIn(page);
  await declineConsent(page);
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Gallery night', pieces: [] } })
  ).json();
  await page.goto(`/look/${look.id}`);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByText('Link copied.', { exact: true })).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/share\/[\w-]+$/);

  const visitor = await browser.newPage();
  await visitor.goto(new URL(url).pathname);
  await expect(visitor.getByRole('heading', { name: 'Gallery night' })).toBeVisible();

  await page.getByRole('button', { name: 'Stop sharing' }).click();
  await expect(page.getByText('Link turned off.', { exact: true })).toBeVisible();
  // A turned-off link is indistinguishable from one that never existed.
  expect((await visitor.reload())?.status()).toBe(404);
  await visitor.close();
});

test('removing a look can be undone', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Weekend', pieces: [] } })
  ).json();
  await page.goto(`/look/${look.id}`);
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page).toHaveURL(/\/looks$/);
  await expect(page.getByText('Look removed.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('link', { name: 'Weekend' })).toBeVisible();
});
