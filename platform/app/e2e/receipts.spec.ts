import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { CLI_ENV } from './env';
import { declineConsent, isolateClientIp, signIn } from './helpers';

const run = promisify(execFile);
const PLATFORM = fileURLToPath(new URL('../..', import.meta.url));
const FIXTURE = fileURLToPath(
  new URL('../../packages/jobs/src/receipts/fixtures/receipt.eml', import.meta.url),
);

// The SES path without SES: the same ingest the inbound worker runs, against the local stack.
async function forward(to: string): Promise<{ status: string; items?: number }> {
  const { stdout } = await run('pnpm', ['--silent', 'receipt:ingest', FIXTURE, '--to', to], {
    cwd: PLATFORM,
    env: CLI_ENV,
    timeout: 60_000,
  });
  const line = stdout.split('\n').find((l) => l.startsWith('RESULT ')) ?? 'RESULT {}';
  return JSON.parse(line.slice('RESULT '.length));
}

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('a forwarded receipt lands in her Inbox and files into the wardrobe', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const { address } = await (await api.get('/api/v1/me/inbox-address')).json();
  expect(address).toMatch(/^[a-z0-9]{20}@in\.robes\.local$/);
  expect((await (await api.get('/api/v1/me/inbox-address')).json()).address).toBe(address);

  expect(await forward(address)).toMatchObject({ status: 'held', items: 2 });
  const { items } = await (await api.get('/api/v1/inbox')).json();
  const receipt = items.find((i: { source: string }) => i.source === 'receipt');
  expect(receipt).toMatchObject({ retailer: 'Sézane' });
  expect(receipt.items.map((i: { label: string }) => i.label)).toEqual([
    'Camel wool coat',
    'Silk scarf',
  ]);

  const decided = await api.post(`/api/v1/inbox/${receipt.id}/decide`, {
    data: { action: 'wardrobe', itemIndexes: [0] },
  });
  expect(decided.ok()).toBe(true);
  const pieces = await (await api.get('/api/v1/wardrobe/items')).json();
  const coat = pieces.items.find((p: { label: string }) => p.label === 'Camel wool coat');
  // The size the receipt printed reads on the line and is filed with the piece.
  expect(receipt.items[0]).toMatchObject({ size: 'M' });
  expect(coat).toMatchObject({ size: 'M', categoryL2: 'Coats' });
});

test('a regenerated or turned-off address stops accepting mail', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const { address: old } = await (await api.get('/api/v1/me/inbox-address')).json();
  const { address: fresh } = await (await api.post('/api/v1/me/inbox-address/regenerate')).json();
  expect(fresh).not.toBe(old);
  expect(await forward(old)).toMatchObject({ status: 'dropped', reason: 'unknown_address' });

  expect((await api.delete('/api/v1/me/inbox-address')).ok()).toBe(true);
  expect(await forward(fresh)).toMatchObject({ status: 'dropped', reason: 'unknown_address' });
});

test('You shows the address with copy, new address and turn off', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you/receipts');
  const section = page.getByRole('region', { name: 'Your own address.' });
  const address = section.getByTestId('inbox-address');
  await expect(address).toHaveText(/@in\.robes\.local$/);
  const first = await address.textContent();
  await section.getByRole('button', { name: 'New address' }).click();
  await expect(address).not.toHaveText(first ?? '');
  await section.getByRole('button', { name: 'Turn off' }).click();
  await expect(section.getByRole('button', { name: 'Get an address' })).toBeVisible();
});

test('Receipts: no notice on the Wardrobe; each piece is added or discarded on its own', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const { address } = await (await page.request.get('/api/v1/me/inbox-address')).json();
  expect(await forward(address)).toMatchObject({ status: 'held', items: 2 });

  // Waiting receipts are the bell's news, never a card on the Wardrobe (Annie, 9 Nov).
  await page.goto('/wardrobe');
  await expect(page.getByRole('tab', { name: 'Owned' })).toBeVisible();
  await expect(page.getByText('pieces waiting')).toHaveCount(0);
  await page.goto('/wardrobe/inbox');

  // Receipts (PRD rev 3 §7.5): INBOX · ADDED · DISCARDED with their counts, the receipt as a group
  // by retailer, each piece with its × and ✓.
  await expect(page.getByRole('tab', { name: 'Inbox 2' })).toBeVisible();
  // The group's count is the pieces in this tab: (2) waiting, then (1) once the scarf goes.
  const group = page.getByRole('region', { name: /^Sézane \(\d\)$/ });
  await expect(group).toHaveAccessibleName('Sézane (2)');
  await group.getByRole('button', { name: 'Discard Silk scarf' }).click();
  await expect(page.getByText('Discarded.', { exact: true })).toBeVisible();
  await expect(group.getByText('Silk scarf')).toHaveCount(0);
  await group.getByRole('button', { name: 'Add Camel wool coat to your wardrobe' }).click();
  await expect(page.getByText('Added to your wardrobe.', { exact: true })).toBeVisible();
  // Nothing waits: the Inbox tab empties and the others count what she decided.
  await expect(page.getByRole('tab', { name: 'Inbox 0' })).toBeVisible();
  await expect(group).toHaveCount(0);
  await page.getByRole('tab', { name: 'Added 1' }).click();
  await expect(group.getByText('Camel wool coat')).toBeVisible();

  const pieces = await (await page.request.get('/api/v1/wardrobe/items')).json();
  const labels = pieces.items.map((p: { label: string }) => p.label);
  expect(labels).toContain('Camel wool coat');
  expect(labels).not.toContain('Silk scarf');
});
