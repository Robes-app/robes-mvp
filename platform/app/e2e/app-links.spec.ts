import { expect, test } from '@playwright/test';
import { E2E_APP_LINKS } from './env';

// N4: Apple's CDN and Google's verifier fetch these signed out, as JSON, with no redirect.

test('serves the apple-app-site-association file signed out', async ({ request }) => {
  const res = await request.get('/.well-known/apple-app-site-association', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/^application\/json/);
  const body = await res.json();
  const appId = `${E2E_APP_LINKS.APPLE_TEAM_ID}.${E2E_APP_LINKS.APPLE_APP_BUNDLE_ID}`;
  expect(body.applinks.details).toHaveLength(1);
  expect(body.applinks.details[0].appIDs).toEqual([appId]);
  const paths: string[] = body.applinks.details[0].components.map((c: { '/': string }) => c['/']);
  expect(paths).toEqual(expect.arrayContaining(['/look/*', '/plan', '/wardrobe/*']));
  for (const path of paths) {
    expect(path).not.toMatch(/^\/(api|auth|share|admin|dev|unsubscribe|waitlist|legal)\b/);
    expect(path).not.toMatch(/^\/\*/);
  }
});

test('serves assetlinks.json signed out', async ({ request }) => {
  const res = await request.get('/.well-known/assetlinks.json', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/^application\/json/);
  expect(await res.json()).toEqual([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: E2E_APP_LINKS.ANDROID_APP_PACKAGE,
        sha256_cert_fingerprints: [E2E_APP_LINKS.ANDROID_CERT_SHA256],
      },
    },
  ]);
});

// F5: the phone learns the web's providers here; the web page shows the same buttons.
test('auth providers match the web sign-in buttons', async ({ request, page }) => {
  const res = await request.get('/api/v1/public/auth-providers');
  expect(res.status()).toBe(200);
  const providers = (await res.json()) as { apple: boolean; google: boolean };
  expect(Object.keys(providers).sort()).toEqual(['apple', 'google']);
  await page.goto('/auth/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign in.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(
    providers.google ? 1 : 0,
  );
  await expect(page.getByRole('button', { name: 'Continue with Apple' })).toHaveCount(
    providers.apple ? 1 : 0,
  );
});
