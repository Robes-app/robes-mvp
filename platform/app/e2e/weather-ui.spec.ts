import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

// The weather line (Annie, 28 Oct): today is live — the conditions now as a line icon, the
// temperature now; a day ahead reads that day's range and conditions. The forecast is stubbed at
// the route, so nothing here reaches Open-Meteo.
test.beforeEach(({ context }) => isolateClientIp(context));

const live = { city: 'Dublin', tempRange: '11–15°C', condition: 'clear', nowC: 13, code: 3 };
const ahead = { city: 'Dublin', tempRange: '4–9°C', condition: 'snow', nowC: null, code: 73 };

test('home and today’s page read the weather now; a day ahead reads its range', async ({
  page,
}) => {
  const asked: (string | null)[] = [];
  let today = '';
  await page.route('**/api/v1/today/weather*', (route) => {
    const date = new URL(route.request().url()).searchParams.get('date');
    asked.push(date);
    const body = !date || date === today ? live : ahead;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.setViewportSize({ width: 440, height: 900 });
  await signIn(page);
  await declineConsent(page);
  ({ date: today } = await (await page.request.get('/api/v1/today')).json());
  await page.goto('/');

  const meta = page.getByTestId('home-meta');
  await expect(meta).toContainText(/Dublin · 13°C$/);
  await expect(meta).not.toContainText('11–15°C');
  // Led by the conditions' line icon (an svg, never an emoji), then a dot.
  await expect(meta.getByRole('img', { name: 'overcast' })).toBeVisible();
  expect(await meta.locator('svg').count()).toBe(1);
  expect(await meta.textContent()).toMatch(/^·\s*\w+day · Dublin · 13°C$/);

  await page.goto(`/plan/${today}`);
  const now = page.getByTestId('day-weather');
  await expect(now).toContainText('Dublin · overcast · 13°C');
  // The advice reads the whole day.
  await expect(now).toContainText('Bring one warm layer.');
  await expect(now.locator('svg')).toHaveCount(1);

  const later = new Date(`${today}T12:00:00Z`);
  later.setUTCDate(later.getUTCDate() + 3);
  const date = later.toISOString().slice(0, 10);
  await page.goto(`/plan/${date}`);
  const day = page.getByTestId('day-weather');
  await expect(day).toContainText('Dublin · snow · 4–9°C');
  await expect(day).toContainText('Boots, and a warm coat.');
  expect(asked).toContain(date);
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
