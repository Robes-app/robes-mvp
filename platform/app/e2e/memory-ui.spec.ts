import { expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

// The wardrobe read is paused (OBS_WARDROBE_READ): an observation comes from what she says.
async function noticeByPrompt(page: Page, text: string): Promise<void> {
  const api = page.request;
  const trouser = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'White wide-leg trouser' } })
  ).json();
  const look = await (
    await api.post('/api/v1/looks', {
      data: { status: 'draft', pieces: [{ pieceId: trouser.id }] },
    })
  ).json();
  const res = await api.post(`/api/v1/looks/${look.id}/ask`, {
    data: {
      surface: 'draft',
      text,
      rack: [{ key: trouser.id, pieceId: trouser.id, proposal: null }],
    },
    headers: { 'idempotency-key': crypto.randomUUID() },
  });
  expect(res.status()).toBe(202);
  const jobId = (await res.json()).jobId;
  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toMatch(/succeeded|partial/);
}

test('an observation is hers: That’s right keeps it, × takes it off and Robes never reads', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await noticeByPrompt(page, "I don't wear double denim");
  await page.goto('/you');

  const noticed = page.getByRole('region', { name: 'Observations' });
  await expect(noticed.getByText('No double denim')).toBeVisible({ timeout: 30_000 });
  expect(await seriousViolations(page)).toEqual([]);
  await noticed.getByRole('button', { name: 'That’s right: No double denim' }).click();
  await expect(page.getByText('Kept. Filed under Style DNA.', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Observations' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Observations' })).toBeVisible();
  const kept = page.getByRole('region', { name: 'Kept before' });
  await expect(kept.getByText('No double denim')).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await kept.getByRole('button', { name: 'Remove from your Style DNA: No double denim' }).click();
  await expect(page.getByText('Removed from your Style DNA.', { exact: true })).toBeVisible();
  await expect(page.getByText('No double denim')).toHaveCount(0);

  const dna = await (await page.request.get('/api/v1/me/dna')).json();
  expect(dna.brief.rules.map((l: { text: string }) => l.text)).not.toContain('No double denim');
  expect(dna.readDue).toBe(false);
  // The wardrobe read is paused: it is refused, so nothing is ever drafted from her wardrobe.
  expect((await page.request.post('/api/v1/me/dna/read')).status()).toBe(409);
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
  // The row reads the first name and a count, never a list cut mid-word.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Brands.*The Row \+1/ })).toBeVisible();

  await page.getByRole('button', { name: /^Investment level/ }).click();
  // One answer: the levels are radios, and the sheet closes on Done (every tap already saved).
  const level = page.getByRole('dialog', { name: 'Investment level' });
  await level.getByRole('radio', { name: /^€500–1,500/ }).click();
  await expect(level.getByRole('radio', { name: /^€500–1,500/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await level.getByRole('button', { name: 'Done' }).click();
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

  await page.goto('/you/model/body');
  await page.getByRole('button', { name: 'The facts' }).click();
  const facts = page.getByRole('dialog', { name: 'The facts' });
  await facts.getByRole('button', { name: 'More: Size' }).click();
  await expect(facts.getByLabel('Size', { exact: true })).toHaveText('UK 10');
  // Title and fields only: age and gender live in their own pills on Body shape.
  await expect(facts.getByRole('button', { name: '45–54' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Age/ }).click();
  await page.getByRole('menuitemradio', { name: '45–54' }).click();
  await expect(page.getByRole('button', { name: /^Age.*45–54/ })).toBeVisible();

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
