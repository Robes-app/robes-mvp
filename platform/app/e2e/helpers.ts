import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, expect, type Page } from '@playwright/test';
import { E2E_DATABASE_URL } from './env';
import { latestCodeFor } from './mailpit';

// OTP requests are rate limited per IP (3/min), so each test looks like its own client.
export async function isolateClientIp(context: BrowserContext): Promise<void> {
  const octet = (): number => Math.floor(Math.random() * 250);
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
}

export function uniqueEmail(tag = 'e2e'): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
}

export const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

// Walks onboarding from the name (handoff 30 Oct): name → identity → styles, brands and colours
// left empty → Get started; lands home.
export async function completeOnboarding(page: Page, firstName = 'Niall'): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('First name').fill(firstName);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'How do you identify?' })).toBeVisible();
  await page.getByRole('radio', { name: 'Woman' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const title of ['Which styles feel like you?', 'Any favourite brands?']) {
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(
    page.getByRole('heading', { level: 1, name: 'Colours you love or avoid.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`, ${firstName}\\.$`) })).toBeVisible();
}

// Signs up a fresh user with an emailed code and completes onboarding; lands home.
export async function signIn(
  page: Page,
  email = uniqueEmail(),
  firstName = 'Niall',
): Promise<string> {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email.' })).toBeVisible();

  await page.getByLabel('Code').fill(await latestCodeFor(email));
  await page.getByRole('button', { name: 'Continue' }).click();
  await completeOnboarding(page, firstName);
  return email;
}

const BYTES = readFileSync(PHOTO);

// A photographed piece filed straight through the API.
export async function photographedPiece(page: Page, label: string): Promise<string> {
  const api = page.request;
  const { assetId, upload } = await (
    await api.post('/api/v1/uploads', {
      data: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: BYTES.length },
    })
  ).json();
  await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: BYTES });
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);
  const piece = await (
    await api.post('/api/v1/wardrobe/items', { data: { label, imageAssetId: assetId } })
  ).json();
  return piece.id;
}

// A photographed piece styled three ways: the deck opens on its looks.
export async function styledPiece(page: Page, label = 'Cream long-sleeve t-shirt'): Promise<void> {
  const pieceId = await photographedPiece(page, label);
  const res = await page.request.post('/api/v1/looks/generate', {
    data: { anchor: { type: 'piece', pieceId } },
  });
  expect(res.ok()).toBe(true);
  const { jobId } = await res.json();
  await page.goto(`/looks/style/${jobId}?from=home`);
}

// Zero serious/critical axe violations (ux-opportunities.md §4.4).
// Scans the settled page: data loaded and no transition mid-way, so colour contrast is measured
// on final colours rather than a skeleton or a fading element.
export async function seriousViolations(page: Page): Promise<string[]> {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForLoadState('networkidle');
  // Infinite animations (loading pulses) never finish, so the wait is capped.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]),
  );
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

// Answers analytics consent so its ask never covers the page (consent.spec tests the ask itself).
// The ask waits for her first filed piece, so the answer goes straight to the API.
export async function declineConsent(page: Page): Promise<void> {
  const res = await page.request.post('/api/v1/me/consents', {
    data: { source: 'web', consents: { analytics: false } },
  });
  expect(res.ok()).toBe(true);
  await page.reload();
}

const PLATFORM = fileURLToPath(new URL('../..', import.meta.url));

// The documented way to make someone an admin locally (docs/DEVELOPING.md → Admin), against the
// e2e server's database (app/.env.local may name another one).
export function grantAdmin(email: string): void {
  execFileSync('pnpm', ['--filter', '@robes/db', 'admin:grant', email], {
    cwd: PLATFORM,
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });
}
