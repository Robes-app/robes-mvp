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
  const save = page.getByRole('button', { name: 'Save look' });
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Include Camel coat' }).click();
  await page.getByRole('button', { name: 'Include Straight jeans' }).click();
  await expect(page.getByText('2 pieces')).toBeVisible();
  await save.click();

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

  await page.goto('/plan');
  const day = page.getByRole('listitem', { name: 'Tomorrow' });
  await expect(day.getByRole('link', { name: 'Camel coat, styled' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await day.getByLabel(/^What’s on/).fill('Gallery opening');
  await day.getByLabel(/^What’s on/).press('Enter');
  await expect
    .poll(async () => {
      const plan = await (await page.request.get(`/api/v1/plan?from=${tomorrow}&days=1`)).json();
      return plan.days[0].entries[0]?.activity;
    })
    .toBe('Gallery opening');

  await day.getByRole('button', { name: 'Take Camel coat, styled off this day' }).click();
  await expect(day.getByRole('link', { name: 'Camel coat, styled' })).toBeHidden();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(day.getByRole('link', { name: 'Camel coat, styled' })).toBeVisible();

  await page.goto('/looks');
  await expect(page.getByRole('link', { name: 'Camel coat, styled' })).toBeVisible();
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
