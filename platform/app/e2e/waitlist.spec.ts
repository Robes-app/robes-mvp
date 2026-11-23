import { expect, test } from '@playwright/test';
import { isolateClientIp, uniqueEmail } from './helpers';
import { countMessagesTo, latestMessageTo, messageText } from './mailpit';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('joining the waitlist is double opt-in and never reveals an existing address', async ({
  page,
}) => {
  // The app's front door is sign up now (18 Nov design); the waitlist is joined through its API.
  const email = uniqueEmail('e2e-wl');
  const join = await page.request.post('/api/v1/public/waitlist', {
    data: { email, name: 'Niall', utm: { utm_source: 'instagram' } },
  });
  expect(join.status()).toBe(202);

  const mail = await latestMessageTo(email);
  expect(mail?.Subject).toBe('Confirm your place on the Robes waitlist');
  const link = (await messageText(mail?.ID ?? '')).match(
    /https?:\/\/\S+\/waitlist\/confirm\?t=\S+/,
  )?.[0];
  expect(link).toBeTruthy();

  // Signing up again answers the same and sends nothing.
  const again = await page.request.post('/api/v1/public/waitlist', { data: { email } });
  expect(again.status()).toBe(202);
  expect(await countMessagesTo(email)).toBe(1);

  await page.goto(new URL(link ?? '').pathname + new URL(link ?? '').search);
  await expect(page.getByRole('heading', { name: 'Confirm your place?' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'You’re on the list. We’ll email you when it’s your turn.',
  );
});

test('a forged confirmation link does nothing', async ({ page }) => {
  await page.goto('/waitlist/confirm?t=00000000-0000-4000-8000-000000000000.forged');
  await expect(page.getByText('This link doesn’t work any more.', { exact: false })).toBeVisible();
});

test('the landing page carries its search and sharing metadata', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Robes — Your Personal Stylist & Wardrobe Intelligence App');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    /^https?:\/\/.+/,
  );
  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  );
  expect(ld).toMatchObject({ '@type': 'SoftwareApplication', name: 'Robes' });
});
