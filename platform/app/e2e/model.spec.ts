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
  expect(fresh).toMatchObject({
    filed: false,
    source: 'hand',
    preset: null,
    stand: { on: 'robes' },
  });
  // Home's twin step is open until a model of her own is filed.
  expect((await (await api.get('/api/v1/today')).json()).home.state.twinOnFile).toBe(false);
  // No model of her own yet: the look stands on the Robes model she chose (plan 2026-11-05), whose
  // portrait is drawn once ever — asking before it exists starts that draw and spends nothing.
  const chosen = await (await api.patch('/api/v1/me/model', { data: { preset: 2 } })).json();
  expect(chosen).toMatchObject({ preset: 2, filed: false, stand: { generic: true, on: 'robes' } });
  // A Robes model is not hers to shape: Colouring and Body shape are the twin's.
  expect((await api.patch('/api/v1/me/model', { data: { skin: 6 } })).status()).toBe(409);
  await api.post(`/api/v1/looks/${look.id}/render`);
  await expect
    .poll(async () => (await (await api.get('/api/v1/me/model')).json()).stand.imageUrl, {
      timeout: 30_000,
    })
    .toBeTruthy();
  const generic = await api.post(`/api/v1/looks/${look.id}/render`);
  expect(generic.status()).toBe(202);
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).onModel, {
      timeout: 30_000,
    })
    .toBe('ready');
  // Drawn on a Robes model: the look wears the tag (plan 2026-11-05 §2.4), read from the picture.
  expect((await (await api.get(`/api/v1/looks/${look.id}`)).json()).onRobesModel).toBe(true);

  // Her facts draw a twin of her own; once asked for, it stands over the Robes model she chose.
  await api.patch('/api/v1/me/dna', { data: { facts: { heightCm: 170, sizeUk: 12 } } });
  const asked = await (await api.post('/api/v1/me/model/twin')).json();
  expect(asked).toMatchObject({ filed: true, preset: null, stand: { generic: false } });
  await expect
    .poll(async () => (await (await api.get('/api/v1/me/model')).json()).twin.status, {
      timeout: 30_000,
    })
    .toBe('ready');
  const { twin, stand } = await (await api.get('/api/v1/me/model')).json();
  expect(stand.on).toBe('twin');
  expect((await fetch(twin.imageUrl)).status).toBe(200);
  // Hers to shape now.
  const filed = await (
    await api.patch('/api/v1/me/model', { data: { skin: 6, line: 'soft' } })
  ).json();
  expect(filed).toMatchObject({ filed: true, cellId: 'w-s6-h1-nt-ll' });
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
  // Re-drawn on her: the tag goes.
  expect((await (await api.get(`/api/v1/looks/${look.id}`)).json()).onRobesModel).toBe(false);
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

test('You › Your digital twin: on a Robes model the doors are closed; her facts draw her, then she nudges colouring and line', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');
  await page.getByRole('link', { name: 'Your digital twin' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your digital twin' })).toBeVisible();
  // On a Robes model (plan 2026-11-05, design 3c): its eyebrow, Create your digital twin, the
  // lineup of five, and no door to Colouring or Body shape. Nothing of hers to delete.
  await expect(page.getByText('Robes model', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create your digital twin' })).toBeVisible();
  await expect(page.getByTestId('twin-delete')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Model \d$/ })).toHaveCount(5);
  await expect(page.getByRole('link', { name: /Colouring/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Model 3' }).click();
  await expect(page.getByRole('button', { name: 'Model 3', pressed: true })).toBeVisible();
  // Her facts give her a twin of her own: landing draws it and the doors open (design 3d), with
  // her first in the lineup and the retake on the hero.
  await page.request.patch('/api/v1/me/dna', { data: { facts: { heightCm: 168 } } });
  await page.reload();
  await expect(page.getByRole('link', { name: /Colouring/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'You', pressed: true })).toBeVisible();
  // R15: the redraw control on the hero, named for what it does.
  await expect(
    page.getByRole('button', { name: 'Retake selfie to update your twin' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /Colouring/ }).click();
  // No close-up card: the selfie is taken a screen earlier, and the swatches read as hand picks.
  await expect(page.getByText('Your close-up')).toHaveCount(0);
  await page.getByRole('button', { name: 'Porcelain' }).click();
  await expect(page.getByRole('button', { name: 'Porcelain' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: 'Back' }).click();

  await page.getByRole('link', { name: /Body shape/ }).click();
  await page.getByRole('button', { name: 'Hips: much fuller' }).click();
  await expect(page.getByRole('button', { name: 'Hips: much fuller' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: 'Back' }).click();

  // Leaving a twin screen draws her twin once; the hero shows it.
  await expect(page.getByRole('img', { name: 'Your model' })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => (await (await page.request.get('/api/v1/me/model')).json()).twin, {
      timeout: 30_000,
    })
    .toMatchObject({ status: 'ready', current: true });
  const model = await (await page.request.get('/api/v1/me/model')).json();
  expect(model).toMatchObject({ skin: 7, skinSet: true, adj: { hips: 2 }, stand: { on: 'twin' } });
  // Nothing changed: asking again draws nothing new and answers with the twin on file.
  const again = await (await page.request.post('/api/v1/me/model/twin')).json();
  expect(again.twin).toMatchObject({ status: 'ready', current: true });

  // Delete my digital twin (design "Your model · Delete twin", 12 Nov): one question, Keep it
  // changes nothing; Delete stands her on a Robes model with her facts and picks gone.
  await page.getByRole('button', { name: 'Delete my digital twin' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Delete your digital twin?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(page.getByRole('img', { name: 'Your model' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete my digital twin' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create your digital twin' })).toBeVisible();
  await expect(page.getByTestId('twin-delete')).toHaveCount(0);
  const gone = await (await page.request.get('/api/v1/me/model')).json();
  expect(gone).toMatchObject({ closeUpUrl: null, skinSet: false, stand: { on: 'robes' } });
  expect(gone.twin.imageUrl).toBeNull();
  const dna = await (await page.request.get('/api/v1/me/dna')).json();
  expect(dna.facts.heightCm).toBeNull();
  // Landing again draws nothing: nothing is left to draw her from.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Create your digital twin' })).toBeVisible();
  expect((await (await page.request.get('/api/v1/me/model')).json()).stand.on).toBe('robes');
});
