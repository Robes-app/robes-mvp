import { execFileSync } from 'node:child_process';
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

// Signs up a fresh user with an emailed code and completes onboarding (skipping the first piece);
// lands on Today.
export async function signIn(
  page: Page,
  email = uniqueEmail(),
  firstName = 'Niall',
  firstPiece?: string,
): Promise<string> {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email.' })).toBeVisible();

  await page.getByLabel('Code').fill(await latestCodeFor(email));
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('First name').fill(firstName);
  await page.getByRole('button', { name: 'Continue' }).click();
  if (firstPiece) {
    await page.getByLabel('Describe it').fill(firstPiece);
    await page.getByRole('button', { name: 'Style it' }).click();
    await expect(page).toHaveURL(/\/looks\/style\/[0-9a-f-]{36}$/);
    return email;
  }
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`, ${firstName}\\.$`) })).toBeVisible();
  return email;
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

// Answers the consent banner so it stops covering the bottom of the page (consent.spec tests it).
export async function declineConsent(page: Page): Promise<void> {
  await page
    .getByRole('region', { name: 'Help shape Robes.' })
    .getByRole('button', { name: 'Don’t allow' })
    .click();
  await expect(page.getByRole('region', { name: 'Help shape Robes.' })).toHaveCount(0);
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
