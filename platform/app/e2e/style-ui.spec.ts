import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(({ context }) => isolateClientIp(context));

test('a close-up reads her colouring; on Colouring, she picks the season next door and sets her colours', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  // Colouring is the twin's (plan 2026-11-05 Q9): on a Robes model the door is closed, so her
  // facts draw her twin first, as the model page does on landing.
  await page.request.patch('/api/v1/me/dna', { data: { facts: { heightCm: 168 } } });
  await page.goto('/you');
  await page.getByRole('link', { name: 'Your digital twin' }).click();
  await expect(page).toHaveURL(/\/you\/model$/);
  await expect(page.getByRole('link', { name: /Colouring/ })).toBeVisible({ timeout: 30_000 });
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('link', { name: /Colouring/ }).click();
  await expect(page).toHaveURL(/\/you\/model\/colouring$/);
  // Before a selfie: no skin or hair is ringed, and the page's one door is Add a selfie (the
  // close-up card went with the 5 Nov plan: the selfie is taken a screen earlier).
  await expect(page.getByRole('button', { name: 'Porcelain' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByText('Your close-up')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add a selfie' })).toBeVisible();
  // The selfie's own input (the camera on a phone, the picker on a laptop): her colouring reads,
  // the page lands on Your digital twin while the read runs, then Colouring shows the season.
  await page.getByTestId('selfie-input').setInputFiles(PHOTO);
  await expect(page).toHaveURL(/\/you\/model/, { timeout: 30_000 });
  await expect
    .poll(
      async () => (await (await page.request.get('/api/v1/me/style')).json()).colour?.read_season,
      { timeout: 30_000 },
    )
    .toBe('Soft Autumn');
  await page.goto('/you/model/colouring');
  // The offline fake reads every face as Soft Autumn.
  const season = page.getByRole('region', { name: 'Your season' });
  await expect(season.getByRole('button', { name: 'Soft Autumn', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 30_000 },
  );
  await season.getByRole('button', { name: 'True Autumn', exact: true }).click();
  await expect(season.getByRole('button', { name: 'True Autumn', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // The list holds still under her: it stays anchored on what the photograph read.
  await expect(season.getByRole('button').first()).toHaveText('Soft Autumn');
  // The colour notes open in their own sheet (the retake lives on the twin's hero, R15).
  await season.getByRole('button', { name: 'Full colour notes' }).click();
  await expect(page.getByRole('dialog', { name: 'Full colour notes' })).toBeVisible();
  await page.keyboard.press('Escape');
  const style = await (await page.request.get('/api/v1/me/style')).json();
  expect(style.colour.season).toBe('True Autumn');
  expect(style.colour.read_season).toBe('Soft Autumn');

  // Your colours (Style DNA): Avoid · No view · Love per family, saved at once.
  await page.goto('/you/style');
  await page.getByRole('button', { name: /Your colours/ }).click();
  const coloursSheet = page.getByRole('dialog', { name: 'Your colours' });
  await coloursSheet
    .getByRole('radiogroup', { name: 'Blues' })
    .getByRole('radio', { name: 'Love' })
    .click();
  await expect
    .poll(async () => (await (await page.request.get('/api/v1/me/style')).json()).palette.fam)
    .toEqual({ blues: 1 });
});
