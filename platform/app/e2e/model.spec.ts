import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('she builds her model, Today stops asking, and a look is rendered on her', async ({
  page,
}) => {
  await signIn(page);
  const api = page.request;
  const coat = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Camel coat' } })
  ).json();
  const look = await (
    await api.post('/api/v1/looks', {
      data: { name: 'Gallery opening', pieces: [{ pieceId: coat.id }] },
    })
  ).json();

  const fresh = await (await api.get('/api/v1/me/model')).json();
  expect(fresh).toMatchObject({ filed: false, source: 'hand', cellId: 'w-s3-h1-nt' });
  // Home's twin step is open until a model is filed.
  expect((await (await api.get('/api/v1/today')).json()).home.state.twinOnFile).toBe(false);
  // No model yet: asking to see the look on her is a conflict, not a spend.
  expect((await api.post(`/api/v1/looks/${look.id}/render`)).status()).toBe(409);

  const filed = await (
    await api.patch('/api/v1/me/model', { data: { skin: 6, line: 'soft' } })
  ).json();
  expect(filed).toMatchObject({ filed: true, cellId: 'w-s6-h1-nt-ll' });
  await expect
    .poll(async () => (await (await api.get('/api/v1/me/model')).json()).cell.status, {
      timeout: 30_000,
    })
    .toBe('ready');
  const { cell } = await (await api.get('/api/v1/me/model')).json();
  expect((await fetch(cell.imageUrl)).status).toBe(200);
  expect((await (await api.get('/api/v1/today')).json()).home.state.twinOnFile).toBe(true);

  const started = await api.post(`/api/v1/looks/${look.id}/render`);
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();
  const again = await (await api.post(`/api/v1/looks/${look.id}/render`)).json();
  expect(again.jobId).toBe(jobId);
  await expect
    .poll(
      async () => {
        const l = await (await api.get(`/api/v1/looks/${look.id}`)).json();
        return l.onModel === 'ready' && (l.image?.renditions.length ?? 0) > 0;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
});

test('a model and its renders are hers alone', async ({ page, browser }) => {
  await signIn(page);
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Mine', pieces: [] } })
  ).json();
  await page.request.patch('/api/v1/me/model', { data: { hair: 4 } });

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  expect((await otherPage.request.post(`/api/v1/looks/${look.id}/render`)).status()).toBe(404);
  const theirs = await (await otherPage.request.get('/api/v1/me/model')).json();
  expect(theirs.filed).toBe(false);
  expect((await otherPage.request.patch('/api/v1/me/model', { data: { skin: 12 } })).status()).toBe(
    400,
  );
  await other.close();
});

test('You › Your model: build by hand and pick a skin tone', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');
  await page.getByRole('link', { name: 'Your Digital Twin' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your Digital Twin' })).toBeVisible();
  await page.getByRole('button', { name: 'Build your model' }).click();
  await page.getByRole('button', { name: 'Porcelain' }).click();
  await expect(page.getByRole('button', { name: 'Porcelain' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('img', { name: 'Your model' })).toBeVisible({ timeout: 30_000 });
});
