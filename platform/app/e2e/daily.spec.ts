import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

// Style it for today, on the local stack with the offline AI fake (no weather: no home city).
test.beforeEach(async ({ context }) => isolateClientIp(context));

test('today is styled from her pieces, and naming it saves a Look', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const coat = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Camel coat' } })
  ).json();
  await api.post('/api/v1/wardrobe/items', { data: { label: 'Cream knit' } });

  const started = await api.post('/api/v1/today/generate', {
    data: { prompt: 'Studio day, then dinner' },
    headers: { 'idempotency-key': crypto.randomUUID() },
  });
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toMatch(/succeeded|partial/);
  const { output } = await (await api.get(`/api/v1/jobs/${jobId}`)).json();
  expect(output.dailyLookId).toBeTruthy();

  const url = `/api/v1/today/looks/${output.dailyLookId}`;
  const look = await (await api.get(url)).json();
  expect(look.steps.map((s: { title: string }) => s.title)).toEqual([
    'The Anchor',
    'The Canvas',
    'The Texture',
    'The Accents',
  ]);
  const owned = look.steps.flatMap((s: { items: { piece: { id: string } | null }[] }) =>
    s.items.flatMap((i) => (i.piece ? [i.piece.id] : [])),
  );
  expect(owned.length).toBeGreaterThan(0);
  expect(look.expiresAt).not.toBeNull();

  // Only the anchor renders up front; any other item renders when she asks (UX-09).
  const lookItems = look.steps.flatMap(
    (s: { items: { imageIndex: number; imageStatus: string }[] }) => s.items,
  );
  expect(lookItems[0].imageIndex).toBe(0);
  const other = lookItems.find((i: { imageIndex: number }) => i.imageIndex > 0);
  expect(other.imageStatus).toBe('deferred');
  const render = await api.post(`${url}/items/${other.imageIndex}/render`);
  expect(render.status()).toBe(202);
  const { jobId: renderJob } = await render.json();
  expect((await (await api.post(`${url}/items/${other.imageIndex}/render`)).json()).jobId).toBe(
    renderJob,
  );
  const itemStatus = async () =>
    (await (await api.get(url)).json()).steps
      .flatMap((s: { items: { imageIndex: number; imageStatus: string }[] }) => s.items)
      .find((i: { imageIndex: number }) => i.imageIndex === other.imageIndex).imageStatus;
  await expect.poll(itemStatus, { timeout: 30_000 }).toBe('ready');
  expect((await api.post(`${url}/items/19/render`)).status()).toBe(404);

  const saved = await api.post(`${url}/save`, { data: { name: 'Studio to dinner' } });
  expect(saved.status()).toBe(201);
  const created = await saved.json();
  expect(created).toMatchObject({
    name: 'Studio to dinner',
    source: 'today',
    nameProvisional: false,
  });
  expect(created.pieces.map((p: { piece: { id: string } }) => p.piece.id)).toContain(coat.id);
  const { items } = await (await api.get('/api/v1/looks')).json();
  expect(items.map((l: { id: string }) => l.id)).toContain(created.id);
  expect((await (await api.get(url)).json()).expiresAt).toBeNull();
});

test('daily looks and locked pieces stay private', async ({ page, browser }) => {
  await signIn(page);
  const piece = await (
    await page.request.post('/api/v1/wardrobe/items', { data: { label: 'Mine' } })
  ).json();
  const { jobId } = await (await page.request.post('/api/v1/today/generate', { data: {} })).json();
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toMatch(/succeeded|partial/);
  const { output } = await (await page.request.get(`/api/v1/jobs/${jobId}`)).json();

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const url = `/api/v1/today/looks/${output.dailyLookId}`;
  expect((await otherPage.request.get(url)).status()).toBe(404);
  expect((await otherPage.request.post(`${url}/save`, { data: { name: 'Taken' } })).status()).toBe(
    404,
  );
  expect((await otherPage.request.post(`${url}/items/1/render`)).status()).toBe(404);
  const locked = await otherPage.request.post('/api/v1/today/generate', {
    data: { lockedPieceIds: [piece.id] },
  });
  expect(locked.status()).toBe(404);
  await other.close();
});
