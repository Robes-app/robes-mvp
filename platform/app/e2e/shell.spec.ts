import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const ROOTS = ['Today', 'Wardrobe', 'Lookbook', 'Diary'];

test.beforeEach(({ context }) => isolateClientIp(context));

test('the four roots match on desktop and phone, and each is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page);
  await declineConsent(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link')).toHaveText(ROOTS);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav.getByRole('link')).toHaveText(ROOTS);
  await expect(nav.getByRole('button', { name: 'Create' })).toBeVisible();

  for (const [label, path] of [
    ['Wardrobe', '/wardrobe'],
    ['Lookbook', '/looks'],
    ['Diary', '/plan'],
    ['Today', '/'],
  ] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/' : path}$`));
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  }
});

test('every shell route renders its heading', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const routes: [string, string | RegExp][] = [
    ['/wardrobe', 'Wardrobe'],
    ['/wardrobe/wishlist', 'Wardrobe'],
    ['/wardrobe/inbox', 'Wardrobe'],
    ['/wardrobe/add', 'Add pieces'],
    ['/looks', 'Lookbook'],
    ['/looks/ideas', 'Lookbook'],
    ['/looks/style', 'Which piece?'],
    ['/plan', 'Diary'],
    ['/you', 'You'],
    ['/you/account', 'Account'],
    ['/you/notifications', 'Notifications'],
    ['/you/privacy', 'Privacy.'],
    ['/you/style', 'Style DNA'],
    ['/you/model', 'Your digital twin'],
    ['/you/observations', 'Observations'],
    ['/looks/new', 'New look'],
    ['/legal/terms', 'Terms'],
  ];
  for (const [path, heading] of routes) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading }), path).toBeVisible();
  }
  expect((await page.goto('/soon/nope'))?.status()).toBe(404);
});

test('⌘K goes anywhere and Create opens the IA options', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page);
  await declineConsent(page);
  await page.keyboard.press('ControlOrMeta+k');
  const bar = page.getByRole('combobox', { name: 'Search Robes' });
  await expect(bar).toBeFocused();
  await bar.fill('notif');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/you\/notifications$/);

  await page.getByRole('button', { name: 'Create' }).click();
  const sheet = page.getByRole('dialog', { name: 'Create' });
  await expect(sheet.getByRole('link').first()).toBeVisible();
  // trips.spec flips the trips flag mid-run and pins its door itself.
  const options = (await sheet.getByRole('link').allTextContents()).filter(
    (t) => t !== 'Plan a trip',
  );
  expect(options).toEqual([
    'Photograph pieces',
    'From camera roll',
    'Style a piece',
    'Paste a link',
    'Forward a receipt',
    'New look',
    'Ask Robes',
  ]);
  await sheet.getByRole('link', { name: 'Forward a receipt' }).click();
  await expect(page.getByRole('heading', { name: 'On its way.' })).toBeVisible();
});

test('P0 routes have no serious accessibility violations', async ({ page }) => {
  for (const path of ['/', '/auth/sign-in']) {
    await page.goto(path);
    expect(await seriousViolations(page), path).toEqual([]);
  }
  await signIn(page);
  await declineConsent(page);
  for (const path of [
    '/',
    '/wardrobe',
    '/wardrobe/add',
    '/looks',
    '/looks/ideas',
    '/looks/style',
    '/plan',
    '/you',
    '/you/notifications',
    '/you/account',
    '/you/style',
    '/you/model',
    '/you/observations',
    '/looks/new',
    '/wardrobe/wishlist',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await seriousViolations(page), path).toEqual([]);
  }
});
