import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

test('Robes reads her wardrobe; she keeps a line, strikes one and they stay that way', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');

  // The read runs itself once; the offline fake notices the same lines every time.
  const noticed = page.getByRole('region', { name: 'Robes noticed' });
  await expect(noticed.getByText('You reach for a defined waist')).toBeVisible({
    timeout: 30_000,
  });
  expect(await seriousViolations(page)).toEqual([]);
  await noticed.getByRole('button', { name: 'Keep →' }).click();
  await expect(page.getByText('Kept. Filed under Style DNA.')).toBeVisible();
  await expect(noticed.getByText('One thing that disrupts the line')).toBeVisible();

  await page.getByRole('link', { name: 'Robes Observations' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Robes Observations' })).toBeVisible();
  await page.getByRole('button', { name: 'Not me: Anything that reads polite' }).click();
  await expect(page.getByText('Anything that reads polite')).toHaveCount(0);
  const kept = page.getByRole('region', { name: 'Kept before' });
  await expect(kept.getByText('You reach for a defined waist')).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  const dna = await (await page.request.get('/api/v1/me/dna')).json();
  expect(dna.brief.loves.map((l: { text: string }) => l.text)).toEqual([
    'You reach for a defined waist',
  ]);
  expect(dna.observations.map((o: { text: string }) => o.text)).not.toContain(
    'Anything that reads polite',
  );
  expect(dna.readDue).toBe(false);

  // A struck line never comes back from another read.
  const again = await page.request.post('/api/v1/me/dna/read');
  expect(again.status()).toBe(202);
  const { jobId } = await again.json();
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toBe('succeeded');
  const after = await (await page.request.get('/api/v1/me/dna')).json();
  const texts = after.observations.map((o: { text: string }) => o.text);
  expect(texts).not.toContain('Anything that reads polite');
  expect(texts).not.toContain('You reach for a defined waist');
});

test('Style DNA: her types, a brand, the investment level, a hard no and a fact', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you/style');
  await expect(page.getByRole('heading', { level: 1, name: 'Style DNA' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('button', { name: /^Style type/ }).click();
  const types = page.getByRole('dialog', { name: 'Style type' });
  await types.getByRole('button', { name: /^Minimal/ }).click();
  await expect(types.getByRole('button', { name: /^Minimal/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /^Brands/ }).click();
  const brands = page.getByRole('dialog', { name: 'Brands' });
  // Her type's houses lead the pool.
  await brands.getByRole('button', { name: 'The Row', exact: true }).click();
  await brands.getByLabel('Search brands').fill('Atelier Nouveau');
  await brands.getByRole('button', { name: '+ Add “Atelier Nouveau”' }).click();
  await expect(brands.getByRole('button', { name: 'Remove Atelier Nouveau' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /^Investment level/ }).click();
  await page
    .getByRole('dialog', { name: 'Investment level' })
    .getByRole('button', { name: /^€500–1,500/ })
    .click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Investment level.*€500–1,500/ })).toBeVisible();

  await page.getByRole('button', { name: /^Hard nos/ }).click();
  const nos = page.getByRole('dialog', { name: 'Hard nos' });
  await nos.getByRole('button', { name: 'Heels', exact: true }).click();
  await expect(nos.getByRole('button', { name: 'Heels', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await nos.getByLabel('Another no').fill('Nothing sheer');
  await nos.getByLabel('Another no').press('Enter');
  await expect(nos.getByRole('button', { name: 'Strike “Nothing sheer”' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Hard nos.*2 lines/ })).toBeVisible();

  await page.goto('/you/model');
  await page.getByRole('button', { name: 'The facts' }).click();
  const facts = page.getByRole('dialog', { name: 'The facts' });
  await facts.getByRole('button', { name: 'More: Size' }).click();
  await expect(facts.getByLabel('Size', { exact: true })).toHaveText('UK 10');
  await facts.getByRole('button', { name: '45–54' }).click();
  await expect(facts.getByRole('button', { name: '45–54' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const dna = await (await page.request.get('/api/v1/me/dna')).json();
  expect(dna).toMatchObject({
    types: ['Minimal'],
    brands: ['The Row', 'Atelier Nouveau'],
    investment: '500_1500',
    facts: { sizeUk: 10, ageBand: '45_54' },
  });
  expect(
    dna.brief.avoids.map((l: { text: string; chip: string | null }) => [l.text, l.chip]),
  ).toEqual([
    ['Heels', 'Heels'],
    ['Nothing sheer', null],
  ]);
});

test('her brief, memory and observations are hers alone', async ({ page, browser }) => {
  await signIn(page);
  const api = page.request;
  await api.post('/api/v1/me/dna/lines', { data: { list: 'rules', text: 'No double denim' } });
  const mine = await (await api.get('/api/v1/me/dna')).json();
  const line = mine.brief.rules[0];
  expect(line).toMatchObject({ text: 'No double denim', source: 'typed' });
  expect(
    (
      await api.post('/api/v1/me/memory', {
        data: { kind: 'verdict', verdict: 0, body: 'too safe' },
      })
    ).status(),
  ).toBe(200);
  expect((await api.post('/api/v1/me/memory', { data: { kind: 'swap' } })).status()).toBe(400);
  // No colour read yet: there is no season to change.
  expect(
    (await api.put('/api/v1/me/style/season', { data: { season: 'True Autumn' } })).status(),
  ).toBe(404);

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const theirs = otherPage.request;
  expect((await theirs.delete(`/api/v1/me/dna/lines/${line.id}`)).status()).toBe(404);
  expect((await theirs.post(`/api/v1/me/dna/observations/${line.id}/keep`)).status()).toBe(404);
  expect((await (await theirs.get('/api/v1/me/dna')).json()).brief.rules).toEqual([]);
  await other.close();

  const removed = await (await api.delete(`/api/v1/me/dna/lines/${line.id}`)).json();
  expect(removed.brief.rules).toEqual([]);
});
