import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

test('notification toggles save at once and persist', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you/notifications');
  const nudges = page.getByRole('switch', { name: 'Gentle nudges to add pieces' });
  await expect(nudges).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'When your looks are ready' })).toBeChecked();
  await nudges.click();
  await expect(nudges).toBeChecked();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Gentle nudges to add pieces' })).toBeChecked();
});

test('account name edits show across the shell', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you/account');
  await expect(page.getByLabel('Email')).toHaveAttribute('readonly', '');
  await page.getByLabel('First name').fill('Annie');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /, Annie\.$/ })).toBeVisible();
});

test('deleting the account needs the typed word and then shows as requested', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete account' });
  const confirm = dialog.getByRole('button', { name: 'Delete my account' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await confirm.click();
  const requested = 'Your account is being deleted. Robes will email you when it’s done.';
  await expect(page.getByRole('status').filter({ hasText: requested })).toBeVisible();
  await page.reload();
  await expect(page.getByText(requested)).toBeVisible();
});
