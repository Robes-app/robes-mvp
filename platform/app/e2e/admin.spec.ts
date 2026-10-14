import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn, uniqueEmail } from './helpers';

const PLATFORM = fileURLToPath(new URL('../..', import.meta.url));

// The documented way to make someone an admin locally (docs/DEVELOPING.md → Admin).
function grantAdmin(email: string): void {
  execFileSync('pnpm', ['--filter', '@robes/db', 'admin:grant', email], {
    cwd: PLATFORM,
    stdio: 'pipe',
  });
}

const ADMIN_API: [string, string][] = [
  ['GET', '/api/v1/admin/users'],
  ['GET', '/api/v1/admin/users/00000000-0000-4000-8000-000000000000'],
  ['GET', '/api/v1/admin/health'],
  ['GET', '/api/v1/admin/costs'],
  ['GET', '/api/v1/admin/flags'],
  ['PATCH', '/api/v1/admin/flags/uploads'],
  ['GET', '/api/v1/admin/audit'],
];
const ADMIN_PAGES = ['/admin', '/admin/users', '/admin/costs', '/admin/flags', '/admin/audit'];

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
  for (const url of ['/admin', '/admin/users', '/admin/costs', '/admin/flags', '/admin/audit']) {
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
