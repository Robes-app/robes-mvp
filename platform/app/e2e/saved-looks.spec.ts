import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('a look is built, named, varied, worn and undone', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const piece = async (label: string) =>
    (await (await api.post('/api/v1/wardrobe/items', { data: { label } })).json()).id as string;
  const coat = await piece('Camel coat');
  const jeans = await piece('Straight jeans');

  const created = await api.post('/api/v1/looks', {
    data: { pieces: [{ pieceId: coat, role: 'anchor' }, { pieceId: jeans }] },
  });
  expect(created.status()).toBe(201);
  const look = await created.json();
  // Robes offers a name; it stays provisional until she names it.
  expect(look).toMatchObject({ name: 'Camel coat, styled', nameProvisional: true, timesWorn: 0 });
  expect(look.pieces.map((p: { piece: { label: string } }) => p.piece.label)).toEqual([
    'Camel coat',
    'Straight jeans',
  ]);

  const url = `/api/v1/looks/${look.id}`;
  const named = await (await api.patch(url, { data: { name: 'Gallery opening' } })).json();
  expect(named).toMatchObject({ name: 'Gallery opening', nameProvisional: false });

  const variant = await (
    await api.post(`${url}/variants`, { data: { pieces: [{ pieceId: coat }] } })
  ).json();
  expect(variant).toMatchObject({ originLookId: look.id, name: 'Gallery opening' });
  expect(variant.pieces).toHaveLength(1);

  const wear = await api.post(`${url}/wears`, { data: { wornOn: '2026-09-24' } });
  expect(wear.status()).toBe(201);
  expect(await wear.json()).toMatchObject({ wornOn: '2026-09-24', pieceIds: [coat, jeans] });
  expect((await (await api.get(url)).json()).lastWornOn).toBe('2026-09-24');
  expect((await api.delete(`${url}/wears/2026-09-24`)).ok()).toBe(true);
  expect((await (await api.get(url)).json()).timesWorn).toBe(0);

  expect((await api.delete(url)).ok()).toBe(true);
  expect((await api.get(url)).status()).toBe(404);
  expect((await api.post(`${url}/restore`)).ok()).toBe(true);
  const { items } = await (await api.get('/api/v1/looks')).json();
  expect(items.map((l: { id: string }) => l.id)).toEqual(
    expect.arrayContaining([look.id, variant.id]),
  );
});

test('looks and their pieces stay private', async ({ page, browser }) => {
  await signIn(page);
  const mine = await (
    await page.request.post('/api/v1/wardrobe/items', { data: { label: 'Silk scarf' } })
  ).json();
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Mine', pieces: [] } })
  ).json();

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const url = `/api/v1/looks/${look.id}`;
  expect((await otherPage.request.get(url)).status()).toBe(404);
  expect((await otherPage.request.patch(url, { data: { name: 'Taken' } })).status()).toBe(404);
  expect((await otherPage.request.post(`${url}/variants`, { data: {} })).status()).toBe(404);
  expect(
    (await otherPage.request.post(`${url}/wears`, { data: { wornOn: '2026-09-24' } })).status(),
  ).toBe(404);
  // Building a look from someone else's piece is indistinguishable from a missing piece.
  const borrowed = await otherPage.request.post('/api/v1/looks', {
    data: { pieces: [{ pieceId: mine.id }] },
  });
  expect(borrowed.status()).toBe(404);
  await other.close();
});
