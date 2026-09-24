import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

// Style a piece → key_piece job → idea with three looks and rendered frames, on the local stack
// with the offline AI fake when GEMINI_API_KEY is unset.
test.beforeEach(async ({ context }) => isolateClientIp(context));

test('styling a piece produces an idea she can save and delete', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const piece = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Navy blazer' } })
  ).json();

  const started = await api.post('/api/v1/looks/generate', {
    data: { anchor: { type: 'piece', pieceId: piece.id }, occasion: 'Dinner' },
    headers: { 'idempotency-key': crypto.randomUUID() },
  });
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();

  await expect
    .poll(async () => (await (await api.get(`/api/v1/jobs/${jobId}`)).json()).status, {
      timeout: 30_000,
    })
    .toBe('succeeded');

  const { items } = await (await api.get('/api/v1/looks/ideas')).json();
  const idea = items.find((i: { jobId: string }) => i.jobId === jobId);
  expect(idea).toMatchObject({ anchor: { type: 'piece', pieceId: piece.id }, savedAt: null });
  expect(idea.ways).toHaveLength(3);

  // Frames render after the job (S3 event in AWS, in-process here).
  const ideaUrl = `/api/v1/looks/ideas/${idea.id}`;
  await expect
    .poll(
      async () =>
        (await (await api.get(ideaUrl)).json()).frames.map((f: { status: string }) => f.status),
      { timeout: 30_000 },
    )
    .toEqual(['ready', 'ready', 'ready']);
  const ready = await (await api.get(ideaUrl)).json();
  expect(ready.frames[0].image.renditions.length).toBeGreaterThan(0);

  const saved = await (await api.post(`${ideaUrl}/save`)).json();
  expect(saved.savedAt).not.toBeNull();
  expect(saved.expiresAt).toBeNull();

  expect((await api.delete(ideaUrl)).ok()).toBe(true);
  expect((await api.get(ideaUrl)).status()).toBe(404);
});

test('a piece described in words can be styled; others cannot see the idea', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const started = await page.request.post('/api/v1/looks/generate', {
    data: { anchor: { type: 'text', text: 'white linen shirt' } },
  });
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();
  await expect
    .poll(
      async () => (await (await page.request.get(`/api/v1/jobs/${jobId}`)).json()).status,
      { timeout: 30_000 },
    )
    .toMatch(/succeeded|partial/);
  const { items } = await (await page.request.get('/api/v1/looks/ideas')).json();
  const idea = items.find((i: { jobId: string }) => i.jobId === jobId);
  expect(idea.anchor).toEqual({ type: 'text', label: 'white linen shirt' });

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const url = `/api/v1/looks/ideas/${idea.id}`;
  expect((await otherPage.request.get(url)).status()).toBe(404);
  expect((await otherPage.request.post(`${url}/save`)).status()).toBe(404);
  expect((await otherPage.request.delete(url)).status()).toBe(404);
  // Styling someone else's piece is indistinguishable from a missing one.
  const theirs = await otherPage.request.post('/api/v1/looks/generate', {
    data: { anchor: { type: 'piece', pieceId: crypto.randomUUID() } },
  });
  expect(theirs.status()).toBe(404);
  await other.close();
});
