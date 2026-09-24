import { expect, type Page, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

// The EU ingest host and its assets host (remote config); both must stay silent before consent.
const POSTHOG = /^https:\/\/eu(-assets)?\.i\.posthog\.com\//;

test.beforeEach(({ context }) => isolateClientIp(context));

// Every request to PostHog is recorded (and answered locally) so the test can prove none happen early.
async function watchPostHog(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.context().route(POSTHOG, (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return hits;
}

function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

const banner = (page: Page) => page.getByRole('region', { name: 'Help shape Robes.' });

test('declining hides the banner for good and nothing reaches PostHog', async ({ page }) => {
  const hits = await watchPostHog(page);
  await signIn(page);
  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole('button')).toHaveText(['Don’t allow', 'Allow']);

  await banner(page).getByRole('button', { name: 'Don’t allow' }).focus();
  await page.keyboard.press('Enter');
  await expect(banner(page)).toBeHidden();

  await page.reload();
  await expect(page.getByRole('heading', { name: /, Ann\.$/ })).toBeVisible();
  await expect(banner(page)).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(hits).toEqual([]);
  expect(await (await page.request.get('/api/v1/me/consents')).json()).toMatchObject({
    analytics: false,
  });
});

test('accepting starts PostHog only then, persists, and can be withdrawn', async ({ page }) => {
  const hits = await watchPostHog(page);
  const violations = watchCsp(page);
  await signIn(page);
  // A full load settles to network idle (a client-side navigation doesn't report it reliably).
  await page.reload();
  await expect(banner(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(hits, 'PostHog was contacted before consent').toEqual([]);

  await banner(page).getByRole('button', { name: 'Allow', exact: true }).click();
  await expect(banner(page)).toBeHidden();
  await expect.poll(() => hits.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: /, Ann\.$/ })).toBeVisible();
  await expect(banner(page)).toBeHidden();
  expect(await (await page.request.get('/api/v1/me/consents')).json()).toMatchObject({
    analytics: true,
    replay: null,
  });

  await page.goto('/you/privacy');
  const usage = page.getByRole('switch', { name: /Usage counts/ });
  await expect(usage).toBeChecked();
  await usage.uncheck();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  await expect(page.getByRole('switch', { name: /Screen recordings/ })).toBeDisabled();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /, Ann\.$/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const afterWithdrawal = hits.length;
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(hits.length, 'PostHog was contacted after consent was withdrawn').toBe(afterWithdrawal);
  expect(violations).toEqual([]);
});
