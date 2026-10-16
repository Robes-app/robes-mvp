import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

const PHOTO = readFileSync(fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url)));

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('a shared look opens signed out, is frozen at share time, and can be turned off', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const api = page.request;
  const upload = await (
    await api.post('/api/v1/uploads', {
      data: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: PHOTO.length },
    })
  ).json();
  await fetch(upload.upload.url, { method: 'PUT', headers: upload.upload.headers, body: PHOTO });
  await api.post(`/api/v1/uploads/${upload.assetId}/complete`);
  const piece = await (
    await api.post('/api/v1/wardrobe/items', {
      data: { label: 'Camel coat', imageAssetId: upload.assetId },
    })
  ).json();
  await expect
    .poll(
      async () => (await (await api.get(`/api/v1/wardrobe/items/${piece.id}`)).json()).image.status,
    )
    .toBe('ready');
  const look = await (
    await api.post('/api/v1/looks', {
      data: {
        name: 'Gallery opening',
        note: 'Coat over everything.',
        pieces: [{ pieceId: piece.id }],
      },
    })
  ).json();

  const created = await api.post('/api/v1/shares', {
    data: { subjectType: 'look', subjectId: look.id },
  });
  expect(created.status()).toBe(201);
  const share = await created.json();
  expect(share.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  const again = await (
    await api.post('/api/v1/shares', { data: { subjectType: 'look', subjectId: look.id } })
  ).json();
  expect(again.token).toBe(share.token);

  // Later edits don't change what the link shows.
  await api.patch(`/api/v1/looks/${look.id}`, { data: { name: 'Renamed' } });

  const visitor = await browser.newContext();
  await isolateClientIp(visitor);
  const pub = await visitor.request.get(`/api/v1/public/shares/${share.token}`);
  expect(pub.status()).toBe(200);
  const shared = await pub.json();
  expect(shared).toMatchObject({ name: 'Gallery opening', by: expect.any(String) });
  expect(shared.pieces[0].label).toBe('Camel coat');
  expect(shared.pieces[0].image.renditions.length).toBeGreaterThan(0);
  expect(JSON.stringify(shared)).not.toContain(look.id);

  const visitorPage = await visitor.newPage();
  await visitorPage.goto(new URL(share.url).pathname);
  await expect(
    visitorPage.getByRole('heading', { level: 1, name: 'Gallery opening' }),
  ).toBeVisible();
  await expect(visitorPage.getByAltText('Camel coat')).toBeVisible();
  expect(await visitorPage.locator('meta[name="robots"]').getAttribute('content')).toContain(
    'noindex',
  );

  expect((await api.delete(`/api/v1/shares/${share.token}`)).ok()).toBe(true);
  expect((await visitor.request.get(`/api/v1/public/shares/${share.token}`)).status()).toBe(404);
  const gone = await visitorPage.goto(new URL(share.url).pathname);
  expect(gone?.status()).toBe(404);
  await visitor.close();
});

test('only the owner can share or turn off a look', async ({ page, browser }) => {
  await signIn(page);
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Mine', pieces: [] } })
  ).json();
  const { token } = await (
    await page.request.post('/api/v1/shares', { data: { subjectType: 'look', subjectId: look.id } })
  ).json();
  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  expect(
    (
      await otherPage.request.post('/api/v1/shares', {
        data: { subjectType: 'look', subjectId: look.id },
      })
    ).status(),
  ).toBe(404);
  expect((await otherPage.request.delete(`/api/v1/shares/${token}`)).status()).toBe(404);
  expect((await other.request.get('/api/v1/public/shares/not-a-real-token-at-all')).status()).toBe(
    404,
  );
  await other.close();
});
