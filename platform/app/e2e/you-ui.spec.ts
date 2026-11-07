import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

test('Settings (Felix SettingsView): the subview header, Tabs, one drill card each; Account keeps every row', async ({
  page,
}) => {
  await page.route(/\/api\/v1\/me\/notifications(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            key: 'receipts:2',
            kind: 'receipts',
            text: '2 receipts to review',
            line: null,
            date: null,
            lookId: null,
          },
          {
            key: 'diary:2026-11-04',
            kind: 'diary',
            text: 'Log Wednesday’s wear',
            line: null,
            date: '2026-11-04',
            lookId: null,
          },
        ],
      }),
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');
  // The subview header: back, the tracked title. The pill toggle is now underline tabs.
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Style profile' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const style = page.getByRole('navigation', { name: 'Style profile' });
  for (const [name, href] of [
    ['Your digital twin', '/you/model'],
    ['Style DNA', '/you/style'],
    ['Observations', '/you/observations'],
  ] as const) {
    await expect(style.getByRole('link', { name })).toHaveAttribute('href', href);
  }
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('tab', { name: 'Account' }).click();
  await expect(page).toHaveURL(/\/you\?tab=account$/);
  const account = page.getByRole('group', { name: 'Account' });
  // Every row the tab had, on one card, behind the routes it always had.
  for (const [name, href] of [
    [/^Details/, '/you/account'],
    [/^Notifications/, '/you/notifications'],
    [/^Receipts/, '/you/receipts'],
    [/^Privacy and data/, '/you/privacy'],
    [/^Privacy notice/, '/legal/privacy'],
    [/^Terms/, '/legal/terms'],
    [/^Help/, 'mailto:hello@byrobes.com'],
  ] as const) {
    await expect(account.getByRole('link', { name })).toHaveAttribute('href', href);
  }
  // What waits behind the bell is the Notifications row's value — never a fraction.
  await expect(account.getByRole('link', { name: /^Notifications/ })).toContainText('2 new');
  await expect(account.getByText('Email', { exact: true })).toBeVisible();
  await expect(account.getByRole('button', { name: 'Delete account' })).toBeVisible();
  // Sign out is the full-width outline button under the card.
  const signOut = page.getByRole('button', { name: 'Sign out' });
  await expect(signOut).toBeVisible();
  expect((await signOut.boundingBox())?.width).toBeGreaterThan(300);
  expect(await seriousViolations(page)).toEqual([]);

  // The pages behind the rows keep their routes, and come back to the Account tab.
  await account.getByRole('link', { name: /^Notifications/ }).click();
  await expect(page).toHaveURL(/\/you\/notifications$/);
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/you\?tab=account$/);
  await expect(page.getByRole('tab', { name: 'Account' })).toHaveAttribute('aria-selected', 'true');
});

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

test('deleting the account needs the typed word, then signs her out', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you?tab=account');
  await page.getByRole('button', { name: 'Delete account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete account' });
  const confirm = dialog.getByRole('button', { name: 'Delete my account' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await confirm.click();
  // She is told and signed out at once, as on the phone; the job deletes the account behind her.
  // The toast is echoed in its screen-reader live region: check the visible one.
  await expect(page.getByText('Your account is being deleted.').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});
