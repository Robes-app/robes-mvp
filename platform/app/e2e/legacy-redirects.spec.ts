import { expect, test } from '@playwright/test';
import { createDb } from '@robes/db';
import { E2E_DATABASE_URL } from './env';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('legacy app paths land on their new homes, query strings kept', async ({ request }) => {
  const cases: [string, string][] = [
    ['/dashboard', '/'],
    ['/dashboard?d=2026-10-23', '/plan/2026-10-23?d=2026-10-23'],
    ['/wishlist', '/wardrobe/wishlist'],
    ['/diary', '/plan'],
    ['/signup.html?mode=signin', '/auth/sign-in?mode=signin'],
    ['/look/a1b2c3d4e5', '/'],
    ['/board/a1b2c3d4e5', '/share/a1b2c3d4e5'],
    ['/wardrobe?receipts=1', '/wardrobe/inbox?receipts=1'],
    ['/settings?page=twin', '/you/model?page=twin'],
    ['/stylenotes?chapter=brief', '/you/observations?chapter=brief'],
    ['/lookbook?new=1', '/looks/new?new=1'],
    ['/inspiration', '/looks/ideas'],
    ['/api/notify/unsub?t=abc', '/you/notifications?t=abc'],
  ];
  for (const [from, to] of cases) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(307);
    expect(res.headers().location, from).toBe(to);
  }
});

test('a migrated legacy board link opens signed out; an unknown one is not found', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Navy blazer', pieces: [] } })
  ).json();
  const { token: minted } = await (
    await page.request.post('/api/v1/shares', { data: { subjectType: 'look', subjectId: look.id } })
  ).json();
  // What scripts/migrate writes for a public legacy board: its old id kept as the token.
  const legacy = Math.random().toString(36).slice(2, 12).padEnd(10, '0');
  const db = createDb({ connectionString: E2E_DATABASE_URL, max: 1 });
  await db
    .updateTable('shares')
    .set({
      token: legacy,
      legacyToken: true,
      snapshot: JSON.stringify({
        v: 1,
        legacy: true,
        type: 'idea',
        title: 'Navy blazer',
        subtitle: 'Desk · Dinner · Weekend',
        ways: [{ title: 'Desk to dinner', scene: 'Sleeves pushed, loafers.' }],
      }),
    })
    .where('token', '=', minted)
    .execute();
  await db.destroy();

  const visitor = await browser.newContext();
  await isolateClientIp(visitor);
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/board/${legacy}`);
  await expect(visitorPage).toHaveURL(new RegExp(`/share/${legacy}$`));
  await expect(visitorPage.getByRole('heading', { level: 1, name: 'Navy blazer' })).toBeVisible();
  await expect(
    visitorPage.getByRole('heading', { level: 3, name: 'Desk to dinner' }),
  ).toBeVisible();
  expect(await visitorPage.locator('meta[name="robots"]').getAttribute('content')).toContain(
    'noindex',
  );

  const missing = await visitorPage.goto('/board/zzzzzzzzzz');
  expect(missing?.status()).toBe(404);
  await visitor.close();
});
