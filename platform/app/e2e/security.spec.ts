import { expect, test } from '@playwright/test';

test('pages carry CSP and security headers', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h['strict-transport-security']).toContain('max-age=63072000');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-powered-by']).toBeUndefined();
});

test('pages render without CSP violations', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your wardrobe, styled.' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(violations).toEqual([]);
});

test('health returns ok only', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
