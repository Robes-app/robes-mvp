import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

const PHOTO = readFileSync(fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url)));

test.beforeEach(async ({ context }) => isolateClientIp(context));

async function upload(api: APIRequestContext, kind: string): Promise<string> {
  const res = await api.post('/api/v1/uploads', {
    data: { kind, contentType: 'image/jpeg', bytes: PHOTO.length },
  });
  const { assetId, upload: put } = await res.json();
  await fetch(put.url, { method: 'PUT', headers: put.headers, body: PHOTO });
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);
  return assetId;
}

test('a headshot becomes her colour profile, and her corrections stick', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  expect((await (await api.get('/api/v1/me/style')).json()).colour).toBeNull();

  const headshot = await upload(api, 'headshot');
  // Colour needs a headshot: any other photo is indistinguishable from a missing one.
  const wrong = await api.post('/api/v1/me/style/analyse', {
    data: { kind: 'silhouette', assetId: headshot },
  });
  expect(wrong.status()).toBe(404);

  const started = await api.post('/api/v1/me/style/analyse', {
    data: { kind: 'colour', assetId: headshot },
  });
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toBe('succeeded');
  expect((await (await api.get(`/api/v1/jobs/${jobId}`)).json()).output).toMatchObject({
    styleKind: 'colour',
    archetype: 'Soft Autumn',
  });

  const style = await (await api.get('/api/v1/me/style')).json();
  expect(style.colour).toMatchObject({ season: 'Soft Autumn', undertone: 'Warm' });
  expect(style.colour.best_colours.length).toBeGreaterThan(0);

  const corrected = await (
    await api.patch('/api/v1/me/style/overrides', {
      data: { lovedColors: ['Navy'], measurements: { waist: '70cm' } },
    })
  ).json();
  expect(corrected.overrides).toEqual({
    lovedColors: ['Navy'],
    rejectedColors: [],
    measurements: { waist: '70cm' },
  });
  expect(corrected.colour.season).toBe('Soft Autumn');
});

test('someone else’s photo cannot be analysed', async ({ page, browser }) => {
  await signIn(page);
  const headshot = await upload(page.request, 'headshot');
  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const res = await otherPage.request.post('/api/v1/me/style/analyse', {
    data: { kind: 'colour', assetId: headshot },
  });
  expect(res.status()).toBe(404);
  await other.close();
});
