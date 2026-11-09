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
  // iOS navigation redline: one capsule, 16 from each side, 64 tall, 24 above the screen edge, and
  // no sparkle beside it (dressing starts from home's composer).
  await expect(nav.getByRole('button', { name: 'Create' })).toHaveCount(0);
  expect(await nav.getByRole('list').boundingBox()).toEqual({
    x: 16,
    y: 844 - 24 - 64,
    width: 390 - 32,
    height: 64,
  });
  // Felix's TopNav: 64 tall; the avatar a 30 disc standing 24 from the edge, its hit area 44.
  const banner = page.getByRole('banner');
  expect((await banner.boundingBox())?.height).toBe(64);
  const you = banner.getByRole('link', { name: 'Your profile and settings' });
  const disc = await you.boundingBox();
  expect(disc && [disc.width, disc.height, 390 - (disc.x + disc.width)]).toEqual([30, 30, 24]);
  const hit = await you.evaluate((el) => {
    const after = getComputedStyle(el, '::after');
    return [after.top, after.left];
  });
  expect(hit).toEqual(['-7px', '-7px']);

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

test('the bar keeps its hairline; the grids minimise the dock on scroll down', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  const banner = page.getByRole('banner');
  const nav = page.getByRole('navigation', { name: 'Main' });
  // Room to scroll whatever the wardrobe holds.
  const scrollTo = (y: number) =>
    page.evaluate((top) => {
      document.body.style.minHeight = '4000px';
      window.scrollTo(0, top);
    }, y);

  await page.goto('/wardrobe');
  await expect(banner).toHaveCSS('border-bottom-style', 'solid');
  await expect(banner).not.toHaveAttribute('data-scrolled');
  await scrollTo(600);
  await expect(banner).toHaveAttribute('data-scrolled', 'true');
  // Minimised: the current tab alone at the leading edge; scrolling up restores the four.
  await expect(nav.getByRole('link')).toHaveCount(0);
  const current = nav.getByRole('button', { name: 'Wardrobe' });
  expect(await current.boundingBox()).toEqual(expect.objectContaining({ x: 16, width: 56 }));
  await scrollTo(200);
  await expect(nav.getByRole('link')).toHaveText(ROOTS);
  // A tap restores it too.
  await scrollTo(900);
  await current.click();
  await expect(nav.getByRole('link')).toHaveText(ROOTS);

  // Off by default: Home keeps its dock whole however far she scrolls.
  await page.goto('/');
  await scrollTo(900);
  await expect(banner).toHaveAttribute('data-scrolled', 'true');
  await expect(nav.getByRole('link')).toHaveText(ROOTS);
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
  await expect(banner.getByRole('link', { name: 'Your profile and settings' })).toBeVisible();

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
  await page.getByRole('link', { name: 'Your profile and settings' }).focus();
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();

  // The roots carry no pill at either width. From 768 the bar keeps the wordmark; on a phone a
  // tab's serif title stands in its place (PRD rev 3 §2.2) and the page's h1 names it for AT.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/wardrobe');
    if (width >= 768) {
      await expect(banner.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    } else {
      await expect(banner.getByRole('link', { name: 'Home' })).toHaveCount(0);
      await expect(banner.getByTestId('tab-title')).toHaveText('Your wardrobe');
    }
    await expect(page.getByRole('link', { name: 'October 2026' })).toHaveCount(0);
  }
  // Back from the day lands on the Diary, and its title comes back with it.
  await page.goto('/plan/2026-10-14');
  await banner.getByRole('link', { name: 'October 2026' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(banner.getByTestId('tab-title')).toHaveText('Diary');
});

test('every shell route renders its heading', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const routes: [string, string | RegExp][] = [
    ['/wardrobe', 'Your wardrobe'],
    ['/wardrobe/wishlist', 'Your wardrobe'],
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
  await page.getByRole('button', { name: 'Create', exact: true }).click();
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
