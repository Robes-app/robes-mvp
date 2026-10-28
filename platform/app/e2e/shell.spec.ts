import { expect, test } from '@playwright/test';
import { shell } from '@robes/copy';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const ROOTS = ['Home', 'Lookbook', 'Diary', 'Wardrobe'];

test.beforeEach(({ context }) => isolateClientIp(context));

test('the roots match beta on desktop and phone, and each is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page);
  await declineConsent(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  // Desktop: the wordmark is Home; Lookbook · Diary · Wardrobe sit beside it (beta's top nav).
  await expect(nav.getByRole('link')).toHaveText(ROOTS.slice(1));
  await expect(page.getByRole('banner').getByRole('link', { name: 'Home' })).toHaveAttribute(
    'href',
    '/',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav.getByRole('link')).toHaveText(ROOTS);
  await expect(nav.getByRole('button', { name: 'Create' })).toBeVisible();

  for (const [label, path] of [
    ['Wardrobe', '/wardrobe'],
    ['Lookbook', '/looks'],
    ['Diary', '/plan'],
    ['Home', '/'],
  ] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/' : path}$`));
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  }
});

test('a pushed page’s back pill: in the top bar on a phone, at the head of the page on desktop', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const banner = page.getByRole('banner');
  const main = page.getByRole('main');
  // Phone (≤767, beta's #rb-backpill): the pill stands where the wordmark sits — one header row.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan/2026-10-14');
  await expect(banner.getByRole('link', { name: 'October 2026' })).toHaveAttribute('href', '/plan');
  await expect(banner.getByRole('link', { name: 'Home' })).toHaveCount(0);
  await expect(main.getByRole('link', { name: 'October 2026' })).toHaveCount(0);
  // Only one pill reaches assistive tech: the other is display:none at this width.
  await expect(page.getByRole('link', { name: 'October 2026' })).toHaveCount(1);
  await expect(banner.getByRole('link', { name: 'You' })).toBeVisible();

  // Desktop (≥768, beta's .rb-ret): the bar keeps the wordmark; the pill heads the page.
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(banner.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(banner.getByRole('link', { name: 'October 2026' })).toHaveCount(0);
  const back = main.getByRole('link', { name: 'October 2026' });
  await expect(back).toHaveAttribute('href', '/plan');
  await expect(page.getByRole('link', { name: 'October 2026' })).toHaveCount(1);
  const heading = main.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  const [pill, title] = await Promise.all([back.boundingBox(), heading.boundingBox()]);
  expect(pill && title && pill.y + pill.height <= title.y).toBe(true);
  // Keyboard: the bar first, then the pill, then the page.
  await page.getByRole('link', { name: 'You' }).focus();
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();

  // The roots carry no pill at either width.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/wardrobe');
    await expect(banner.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'October 2026' })).toHaveCount(0);
  }
  // Back from the day lands on the Diary, and the wordmark comes back with it.
  await page.goto('/plan/2026-10-14');
  await banner.getByRole('link', { name: 'October 2026' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(banner.getByRole('link', { name: 'Home' })).toBeVisible();
});

test('every shell route renders its heading', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const routes: [string, string | RegExp][] = [
    ['/wardrobe', 'Wardrobe'],
    ['/wardrobe/wishlist', 'Wardrobe'],
    ['/wardrobe/inbox', 'Inbox'],
    ['/wardrobe/add', 'Add pieces'],
    ['/wardrobe/link', 'Add from a shop page.'],
    ['/wardrobe/manual', 'Add a piece.'],
    ['/looks', 'Lookbook'],
    ['/looks/ideas', 'Lookbook'],
    ['/looks/style', 'Which piece?'],
    ['/plan', 'Diary'],
    ['/you', 'Settings'],
    ['/you/account', 'Account'],
    ['/you/notifications', 'Notifications'],
    ['/you/privacy', 'Your data'],
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
  await expect(page.getByRole('heading', { name: shell.notFound.title })).toBeVisible();
  await expect(page.getByRole('link', { name: shell.notFound.back })).toHaveAttribute('href', '/');
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

  // Settings carries its own header (no Create there): Create opens from a root.
  await page.goto('/');
  await page.getByRole('button', { name: 'Create' }).click();
  const sheet = page.getByRole('dialog', { name: 'Create' });
  await expect(sheet.getByRole('link').first()).toBeVisible();
  // trips.spec flips the trips flag mid-run and pins its door itself.
  const options = (await sheet.getByRole('link').allTextContents()).filter(
    (t) => t !== 'Plan a trip',
  );
  // Two groups: pieces in, then the stylist.
  await expect(sheet.getByRole('region')).toHaveText([/^Add pieces/, /^Dress/]);
  expect(options).toEqual([
    'Take a photo',
    'Camera roll',
    'Paste a link',
    'Forward a receipt',
    'Add without a photo',
    'Style a piece',
    'New look',
  ]);
  // Ask Robes is the new-look box itself, leading the sheet (beta's sparkle).
  await expect(sheet.getByTestId('home-box')).toBeVisible();
  await expect(sheet.getByPlaceholder('Where to, and how should it feel?')).toBeVisible();
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
    '/wardrobe/link',
    '/wardrobe/receipt',
    '/wardrobe/manual',
    '/looks',
    '/looks/ideas',
    '/looks/style',
    '/plan',
    '/you',
    '/you/notifications',
    '/you/account',
    '/you/style',
    '/you/model',
    '/you/model/colouring',
    '/you/model/body',
    '/you/observations',
    '/looks/new',
    '/wardrobe/wishlist',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await seriousViolations(page), path).toEqual([]);
  }
});
