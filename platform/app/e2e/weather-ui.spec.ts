import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

// The weather line (Annie, 28 Oct): today is live — the conditions now as a line icon, the
// temperature now. A day's own range stands on its place chip, read with the day (plan.day). The
// forecast is stubbed at the route, so nothing here reaches Open-Meteo.
test.beforeEach(({ context }) => isolateClientIp(context));

const live = { city: 'Dublin', tempRange: '11–15°C', condition: 'clear', nowC: 13, code: 3 };

test('home reads the weather now', async ({ page }) => {
  await page.route('**/api/v1/today/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(live) }),
  );
  await page.setViewportSize({ width: 440, height: 900 });
  await signIn(page);
  await declineConsent(page);
  await page.goto('/');

  const meta = page.getByTestId('home-meta');
  await expect(meta).toContainText(/Dublin · 13°C$/);
  await expect(meta).not.toContainText('11–15°C');
  // The weekday, the city, the temperature now, then the conditions' line icon (an svg, never an
  // emoji) — design 3k's today line.
  await expect(meta.getByRole('img', { name: 'overcast' })).toBeVisible();
  expect(await meta.locator('svg').count()).toBe(1);
  expect(await meta.textContent()).toMatch(/^\w+day · Dublin · 13°C$/);
});

test('without a live reading, home reads the day’s range and leads with no icon', async ({
  page,
}) => {
  await page.route('**/api/v1/today/weather*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ city: 'Dublin', tempRange: '11–15°C', condition: 'clear' }),
    }),
  );
  await signIn(page);
  await declineConsent(page);
  const meta = page.getByTestId('home-meta');
  await expect(meta).toContainText(/Dublin · 11–15°C$/);
  await expect(meta.locator('svg')).toHaveCount(0);
});
