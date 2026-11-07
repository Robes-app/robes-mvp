import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

// Felix NotificationsSheet (plan 2026-11-06, PR 8): the bell's sheet has the drawer header, each
// item a card with its glyph, the task, where it leads and a ›, a × beside it that dismisses it,
// "Nothing new." when empty, and a Done that only closes. What waits is stubbed at the route so the
// sheet's behaviour is pinned without seeding receipts and past days; overnight.spec.ts covers
// the real list.
test.beforeEach(({ context }) => isolateClientIp(context));

const ITEMS = [
  {
    key: 'receipts:2',
    kind: 'receipts',
    text: '2 receipts to review',
    line: 'From Zara',
    date: null,
    lookId: null,
  },
  {
    key: 'diary:2026-11-04',
    kind: 'diary',
    text: 'Log Wednesday’s wear',
    line: 'Nothing filed for the 4th',
    date: '2026-11-04',
    lookId: null,
  },
];

test('the bell’s sheet: cards with where each leads, × dismisses, Done only closes, then empty', async ({
  page,
}) => {
  const dismissed = new Set<string>();
  const posted: string[] = [];
  await page.route(/\/api\/v1\/me\/notifications(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: ITEMS.filter((i) => !dismissed.has(i.key)) }),
    }),
  );
  await page.route('**/api/v1/me/notifications/dismiss', (route) => {
    const { key } = route.request().postDataJSON() as { key: string };
    posted.push(key);
    dismissed.add(key);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  await page.goto('/');

  const bell = page.getByTestId('bell');
  await expect(bell).toHaveAttribute('data-alert', 'true');
  await expect(bell).toHaveAccessibleName('Notifications, 2 new');
  await bell.click();
  const sheet = page.getByRole('dialog', { name: 'Notifications' });
  await expect(sheet).toBeVisible();
  // The drawer header: × · the tracked title · the ink done disc.
  await expect(sheet.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Done' })).toBeVisible();
  const cards = sheet.getByTestId('bell-items').getByRole('link');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('2 receipts to review');
  await expect(cards.nth(0)).toContainText('Wardrobe');
  await expect(cards.nth(0)).toHaveAttribute('href', '/wardrobe/inbox');
  await expect(cards.nth(1)).toContainText('Log Wednesday’s wear');
  await expect(cards.nth(1)).toContainText('Diary');
  await expect(cards.nth(1)).toHaveAttribute('href', '/?day=2026-11-04');
  // A short task, never an exclamation.
  await expect(sheet).not.toContainText('!');
  expect(await seriousViolations(page)).toEqual([]);

  // Done closes and marks nothing read: the dot stays and nothing is dismissed.
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  expect(posted).toEqual([]);
  await expect(bell).toHaveAttribute('data-alert', 'true');

  // × dismisses one card at once; the other stays.
  await bell.click();
  await sheet.getByRole('button', { name: 'Dismiss: 2 receipts to review' }).click();
  await expect(sheet.getByText('2 receipts to review')).toHaveCount(0);
  await expect(sheet.getByText('Log Wednesday’s wear')).toBeVisible();
  await expect.poll(() => posted).toEqual(['receipts:2']);

  // The last one goes and the sheet says so; the dot goes with it.
  await sheet.getByRole('button', { name: 'Dismiss: Log Wednesday’s wear' }).click();
  await expect(sheet.getByTestId('bell-empty')).toHaveText('Nothing new.');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(bell).not.toHaveAttribute('data-alert', 'true');
  await expect(bell).toHaveAccessibleName('Notifications');
});

test('a card leads where it says and closes the sheet', async ({ page }) => {
  await page.route(/\/api\/v1\/me\/notifications(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [ITEMS[0]] }),
    }),
  );
  await signIn(page);
  await declineConsent(page);
  await page.goto('/');
  await page.getByTestId('bell').click();
  const sheet = page.getByRole('dialog', { name: 'Notifications' });
  await sheet.getByRole('link', { name: /^2 receipts to review/ }).click();
  await expect(page).toHaveURL(/\/wardrobe\/inbox$/);
  await expect(sheet).toBeHidden();
});
