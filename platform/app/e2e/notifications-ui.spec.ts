import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

// Felix NotificationsSheet (plan 2026-11-06, PR 8; PRD rev 3 §4.8; design "Onboarding
// notifications", 19 Nov): the bell's sheet has the drawer header, each item a card with its glyph,
// the task, where it leads and a ›, a × beside it that dismisses it (no Clear all), the dot for
// the cards she hasn't seen, and the bell itself stands only while something waits.
// What waits is stubbed at the route so the sheet's behaviour is pinned without seeding receipts
// and past days; overnight.spec.ts covers the real list.
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
const cardsOf = (items: typeof ITEMS, seen: boolean) =>
  items.map((i) => ({ ...i, seen, section: null }));

test('the bell’s sheet: cards with where each leads, opening sees them, × dismisses, the last leaves it caught up', async ({
  page,
}) => {
  const dismissed = new Set<string>();
  const posted: unknown[] = [];
  let seen = false;
  await page.route(/\/api\/v1\/me\/notifications(\?.*)?$/, (route) => {
    const left = ITEMS.filter((i) => !dismissed.has(i.key));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: left, cards: cardsOf(left, seen) }),
    });
  });
  await page.route('**/api/v1/me/notifications/seen', (route) => {
    seen = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route('**/api/v1/me/notifications/dismiss', (route) => {
    const body = route.request().postDataJSON() as { key?: string };
    posted.push(body);
    if (body.key) dismissed.add(body.key);
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
  // The drawer header: × and the tracked title; no Clear all.
  await expect(sheet.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
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

  // Opening saw them: Close dismisses nothing, and the dot is gone while the bell stays.
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toBeHidden();
  expect(posted).toEqual([]);
  await expect(bell).not.toHaveAttribute('data-alert', 'true');
  await expect(bell).toHaveAccessibleName('Notifications');

  // × dismisses one card at once; the other stays.
  await bell.click();
  await sheet.getByRole('button', { name: 'Dismiss: 2 receipts to review' }).click();
  await expect(sheet.getByText('2 receipts to review')).toHaveCount(0);
  await expect(sheet.getByText('Log Wednesday’s wear')).toBeVisible();
  await expect.poll(() => posted).toEqual([{ key: 'receipts:2' }]);

  // The last card dismissed leaves the sheet all caught up; closed, with nothing waiting, the bell
  // is gone.
  await sheet.getByRole('button', { name: 'Dismiss: Log Wednesday’s wear' }).click();
  await expect(sheet.getByTestId('bell-empty')).toHaveText('All caught up.');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(bell).toHaveCount(0);
});

test('a card leads where it says and closes the sheet', async ({ page }) => {
  await page.route(/\/api\/v1\/me\/notifications(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: ITEMS.slice(0, 1), cards: cardsOf(ITEMS.slice(0, 1), false) }),
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
