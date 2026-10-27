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
  // The first piece makes it a draft; the second joins its rack in the same composer; Save keeps it.
  await page.getByRole('button', { name: '+ Add a piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Camel coat' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Draft look')).toBeVisible();
  await page.getByRole('button', { name: '+ Add a piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Straight jeans' }).click();
  await expect(page.getByText('The look · 2 pieces', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Put in the diary', { exact: true })).toBeVisible();
  // Save opens the diary every time; Not yet closes it and writes nothing.
  await page.getByRole('dialog').getByRole('button', { name: 'Not yet' }).click();

  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Camel coat, styled' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep this name' }).click();
  await expect(page.getByText('Robes’ suggestion')).toBeHidden();
  expect(await seriousViolations(page)).toEqual([]);

  // The look's own record stands under the rack, empty until the first day she wears it.
  const record = page.getByRole('region', { name: 'Worn' });
  await expect(record.getByText('Not yet.', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: 'Wear it today' }).click();
  await expect(page.getByText('Worn today.', { exact: true })).toBeVisible();
  // The day it was worn joins the record, and opens that day.
  // Her local date, printed the way core's longDate prints it: "Saturday 24 October".
  const todayLocal = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const longToday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${todayLocal}T00:00:00Z`));
  await expect(record.getByRole('link', { name: `Open ${longToday}` })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(record.getByRole('link', { name: `Open ${longToday}` })).toBeHidden();
  const lookId = page.url().split('/').at(-1) ?? '';
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/looks/${lookId}`)).json()).timesWorn)
    .toBe(0);

  const tomorrow = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  // The calendar on the photograph is the one way a look reaches a day.
  const longTomorrow = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${tomorrow}T00:00:00Z`));
  await page.getByRole('button', { name: 'Put this look in the diary' }).click();
  const diary = page.getByRole('dialog');
  await diary.getByRole('button', { name: longTomorrow }).click();
  await diary.getByRole('button', { name: 'Put it in the diary' }).click();
  await expect(page.getByText(/is in your diary for/)).toBeVisible();

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
