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
  expect(pieces.items.map((p: { label: string }) => p.label)).toContain('Camel wool coat');
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

test('the receipt notice opens one receipt, all ticked; the pill files what stays ticked', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const { address } = await (await page.request.get('/api/v1/me/inbox-address')).json();
  expect(await forward(address)).toMatchObject({ status: 'held', items: 2 });

  await page.goto('/wardrobe');
  const notice = page.getByRole('region', { name: 'Inbox' });
  await expect(notice).toContainText('Robes read one receipt · 2 pieces waiting');
  await notice.getByRole('link', { name: 'Review them →' }).click();

  await expect(page.getByRole('heading', { name: '2 pieces read' })).toBeVisible();
  const scarf = page.getByRole('button', { name: /Silk scarf/ });
  await expect(scarf).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'File 2 pieces' })).toBeVisible();
  await scarf.click();
  await expect(scarf).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'File 1 piece' }).click();
  await expect(page.getByText('Forwarded receipts land here.')).toBeVisible();

  const pieces = await (await page.request.get('/api/v1/wardrobe/items')).json();
  const labels = pieces.items.map((p: { label: string }) => p.label);
  expect(labels).toContain('Camel wool coat');
  expect(labels).not.toContain('Silk scarf');
});
