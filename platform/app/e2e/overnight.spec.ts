import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

const PLATFORM = fileURLToPath(new URL('../..', import.meta.url));

// Runs the real worker CLI (selection → fake Batch API → apply) for one person, as the
// hourly schedule would at 04:00 her time.
function batchTick(now: string, userId: string): void {
  execFileSync(
    'pnpm',
    ['--filter', '@robes/workers', 'batch:tick', `--now=${now}`, `--user=${userId}`],
    {
      cwd: PLATFORM,
      stdio: 'pipe',
      timeout: 60_000,
    },
  );
}

test('the look Robes makes overnight is waiting on Today in the morning', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  await api.post('/api/v1/wardrobe/items', { data: { label: 'Camel coat' } });
  // UTC, so her date at 04:30 UTC is today's date wherever the test runs.
  const me = await (await api.patch('/api/v1/me', { data: { timezone: 'UTC' } })).json();
  const today = new Date().toISOString().slice(0, 10);

  expect((await (await api.get('/api/v1/today')).json()).overnight).toBeNull();
  batchTick(`${today}T04:30:00Z`, me.id);
  // Running it again the same night makes nothing new.
  batchTick(`${today}T04:45:00Z`, me.id);

  const t = await (await api.get('/api/v1/today')).json();
  expect(t.overnight).toMatchObject({ id: expect.any(String) });
  // The waiting batch job never shows in the tray.
  expect(t.tray.filter((j: { kind: string }) => j.kind === 'daily')).toEqual([]);
  const look = await (await api.get(`/api/v1/today/looks/${t.overnight.id}`)).json();
  expect(look.steps.length).toBeGreaterThan(0);

  await page.goto('/');
  const card = page.getByRole('region', { name: 'Your look for today' });
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'Open it →' }).click();
  await expect(page).toHaveURL(new RegExp(`/today/looks/${t.overnight.id}$`));
});
