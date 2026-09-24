import { expect, test } from '@playwright/test';
import { isolateClientIp, uniqueEmail } from './helpers';
import { countMessagesTo, latestMessageTo, messageText } from './mailpit';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('joining the waitlist is double opt-in and never reveals an existing address', async ({
  page,
}) => {
  const email = uniqueEmail('e2e-wl');
  await page.goto('/?utm_source=instagram');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('First name (optional)').fill('Niall');
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.getByRole('status')).toHaveText('Check your email to confirm your place.');

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
