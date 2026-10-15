import { expect, type Page, test } from '@playwright/test';
import {
  declineConsent,
  grantAdmin,
  isolateClientIp,
  seriousViolations,
  signIn,
  uniqueEmail,
} from './helpers';

const ADMIN_API: [string, string][] = [
  ['GET', '/api/v1/admin/users'],
  ['GET', '/api/v1/admin/users/00000000-0000-4000-8000-000000000000'],
  ['GET', '/api/v1/admin/health'],
  ['GET', '/api/v1/admin/costs'],
  ['GET', '/api/v1/admin/metrics'],
  ['GET', '/api/v1/admin/flags'],
  ['PATCH', '/api/v1/admin/flags/uploads'],
  ['GET', '/api/v1/admin/audit'],
];
const ADMIN_PAGES = [
  '/admin',
  '/admin/users',
  '/admin/metrics',
  '/admin/costs',
  '/admin/flags',
  '/admin/audit',
];

async function call(page: Page, method: string, url: string): Promise<number> {
  const res = await page.request.fetch(url, {
    method,
    ...(method === 'PATCH' ? { data: { enabled: true } } : {}),
  });
  return res.status();
}

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('signed out: admin API is 401 and admin pages are not found', async ({ page }) => {
  for (const [method, url] of ADMIN_API) expect(await call(page, method, url), url).toBe(401);
  for (const url of ADMIN_PAGES) expect((await page.goto(url))?.status(), url).toBe(404);
});

test('a regular user gets 403 from the admin API and 404 from admin pages', async ({ page }) => {
  await signIn(page);
  for (const [method, url] of ADMIN_API) expect(await call(page, method, url), url).toBe(403);
  for (const url of ADMIN_PAGES) expect((await page.goto(url))?.status(), url).toBe(404);
});

test('an admin reads users, and every read is audited', async ({ page, browser }) => {
  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherEmail = await signIn(await other.newPage(), uniqueEmail('target'), 'Tia');
  await other.close();

  const email = await signIn(page, uniqueEmail('admin'), 'Ada');
  grantAdmin(email);
  await declineConsent(page);

  await page.goto('/admin/users');
  await page.getByLabel('Email starts with').fill(otherEmail);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: otherEmail }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tia' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Recent jobs' })).toBeVisible();

  const userId = page.url().split('/').at(-1) ?? '';
  const audit = await (await page.request.get(`/api/v1/admin/audit?userId=${userId}`)).json();
  expect(audit.items).toContainEqual(
    expect.objectContaining({ action: 'admin.user.read', actorEmail: email }),
  );

  expect(await seriousViolations(page)).toEqual([]);
  for (const url of ADMIN_PAGES) {
    await page.goto(url);
    expect(await seriousViolations(page), url).toEqual([]);
  }

  const health = await page.request.get('/api/v1/admin/health');
  expect(health.status()).toBe(200);
  const costs = await (await page.request.get('/api/v1/admin/costs?days=7')).json();
  expect(costs.days).toBe(7);
  expect(JSON.stringify(costs)).not.toMatch(/prompt|response/);
});

test('an admin flips a flag from the page, and the change is audited', async ({ page }) => {
  const email = await signIn(page, uniqueEmail('admin'), 'Ada');
  grantAdmin(email);
  await declineConsent(page);
  // today.generate backs no route yet, so flipping it can't disturb other specs running alongside.
  const key = 'today.generate';
  const before = (await (await page.request.get('/api/v1/admin/flags')).json()).items.find(
    (f: { key: string }) => f.key === key,
  ).enabled as boolean;
  try {
    await page.goto('/admin/flags');
    await page.getByRole('switch', { name: key }).click();
    await expect(page.getByText(`${key} is now ${before ? 'off' : 'on'}.`).first()).toBeVisible();
    const after = (await (await page.request.get('/api/v1/admin/flags')).json()).items.find(
      (f: { key: string }) => f.key === key,
    );
    expect(after.enabled).toBe(!before);
    const audit = await (await page.request.get('/api/v1/admin/audit')).json();
    expect(audit.items).toContainEqual(
      expect.objectContaining({
        action: 'admin.flag.set',
        subjectId: key,
        actorEmail: email,
        detail: { from: before, to: !before },
      }),
    );
    expect(
      (
        await page.request.patch('/api/v1/admin/flags/no.such.flag', { data: { enabled: true } })
      ).status(),
    ).toBe(404);
  } finally {
    await page.request.patch(`/api/v1/admin/flags/${key}`, { data: { enabled: before } });
  }
});

test('an admin reads the metrics page: counts only, and the read is audited', async ({ page }) => {
  const email = await signIn(page, uniqueEmail('admin'), 'Ada');
  grantAdmin(email);
  await declineConsent(page);

  await page.goto('/admin');
  await page.getByRole('link', { name: 'Metrics' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Metrics, last 7 days.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Activation, of those who signed up in the window' }),
  ).toBeVisible();
  const jobs = page.getByRole('table', { name: 'Jobs by kind' });
  for (const kind of ['style_brief', 'look_ask', 'wardrobe_pieces', 'look_render:frame']) {
    await expect(jobs.getByRole('cell', { name: kind, exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: '30 days' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Metrics, last 30 days.' }),
  ).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  const res = await page.request.get('/api/v1/admin/metrics?days=30');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.days).toBe(30);
  expect(body.daily).toHaveLength(30);
  expect(body.funnel.signedUp).toBeGreaterThanOrEqual(1);
  expect(JSON.stringify(body)).not.toContain('@');
  const audit = await (await page.request.get('/api/v1/admin/audit')).json();
  expect(audit.items).toContainEqual(
    expect.objectContaining({ action: 'admin.metrics.read', actorEmail: email }),
  );
});
