import { expect, type Page, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

// Style a piece / dress a day → key_piece job → three SUGGESTED looks (look states), on the local
// stack with the offline AI fake when GEMINI_API_KEY is unset.
test.beforeEach(async ({ context }) => isolateClientIp(context));

const key = () => ({ 'idempotency-key': crypto.randomUUID() });

async function settle(
  page: Page,
  jobId: string,
): Promise<{ status: string; output: Record<string, unknown> }> {
  let snap = { status: 'queued', output: {} };
  await expect
    .poll(
      async () => {
        snap = await (await page.request.get(`/api/v1/jobs/${jobId}`)).json();
        return snap.status;
      },
      { timeout: 30_000 },
    )
    .toMatch(/succeeded|partial|failed/);
  return snap;
}

test('styling a piece mints three suggestions; one is saved as is, one edited into a draft', async ({
  page,
}) => {
  await signIn(page);
  const api = page.request;
  const piece = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Navy blazer' } })
  ).json();

  const started = await api.post('/api/v1/looks/generate', {
    data: { anchor: { type: 'piece', pieceId: piece.id }, occasion: 'Dinner' },
    headers: key(),
  });
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();
  const job = await settle(page, jobId);
  expect(job.status).toBe('succeeded');
  const setId = job.output.setId as string;

  // The deck: the set's looks, all suggested, around her piece, the first one framed.
  const setUrl = `/api/v1/looks/sets/${setId}`;
  const set = await (await api.get(setUrl)).json();
  expect(set).toMatchObject({ mode: 'piece', anchor: { id: piece.id }, jobId });
  expect(set.looks).toHaveLength(3);
  for (const look of set.looks) {
    expect(look).toMatchObject({ status: 'suggested', anchor: { id: piece.id }, setId });
    expect(look.pieces.map((p: { piece: { id: string } }) => p.piece.id)).toContain(piece.id);
    expect(look.proposals.length).toBeGreaterThan(0);
    expect(look.note).not.toBeNull();
  }
  await expect
    .poll(
      async () => (await (await api.get(setUrl)).json()).looks[0].image?.renditions.length ?? 0,
      {
        timeout: 30_000,
      },
    )
    .toBeGreaterThan(0);
  expect(set.looks[0].frame).toBe(true);

  // Suggestions never reach saved readers.
  expect((await (await api.get('/api/v1/looks')).json()).items).toEqual([]);
  const suggested = await (await api.get('/api/v1/looks?status=suggested')).json();
  expect(suggested.items).toHaveLength(3);
  const around = await (
    await api.get(`/api/v1/looks?status=suggested&anchorPieceId=${piece.id}`)
  ).json();
  expect(around.items).toHaveLength(3);
  const [first, second, third] = set.looks;
  expect(
    (
      await api.post(`/api/v1/looks/${first.id}/wears`, { data: { wornOn: '2026-10-15' } })
    ).status(),
  ).toBe(404);

  // The second look's frame is drawn when she reaches it; asking again spends nothing.
  const frame = await api.post(`/api/v1/looks/${second.id}/frame`);
  expect(frame.status()).toBe(202);
  const again = await (await api.post(`/api/v1/looks/${second.id}/frame`)).json();
  expect(again.jobId).toBe((await frame.json()).jobId);
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${second.id}`)).json()).frame, {
      timeout: 30_000,
    })
    .toBe(true);

  // Save to lookbook, as is.
  const saved = await (await api.post(`/api/v1/looks/${first.id}/save`, { data: {} })).json();
  expect(saved).toMatchObject({
    id: first.id,
    status: 'saved',
    frame: true,
    composedByRobes: true,
  });
  expect(
    (await (await api.get('/api/v1/looks')).json()).items.map((l: { id: string }) => l.id),
  ).toEqual([first.id]);

  // Edit: changing the rack makes it a draft; how a piece is worn rides along.
  const edited = await (
    await api.patch(`/api/v1/looks/${second.id}`, {
      data: {
        proposals: second.proposals.slice(1),
        styling: { [piece.id]: 'worn open' },
        edits: { [piece.id]: { back: true } },
      },
    })
  ).json();
  expect(edited).toMatchObject({ status: 'draft', styling: { [piece.id]: 'worn open' } });
  const drafts = await (await api.get('/api/v1/looks?status=draft')).json();
  expect(drafts.items.map((l: { id: string }) => l.id)).toEqual([second.id]);

  // ↻ re-writes a suggestion in place; a draft can't be re-rolled.
  const restyle = await api.post(`/api/v1/looks/${third.id}/restyle`, { headers: key() });
  expect(restyle.status()).toBe(202);
  expect((await settle(page, (await restyle.json()).jobId)).status).toBe('succeeded');
  const rewritten = await (await api.get(`/api/v1/looks/${third.id}`)).json();
  expect(rewritten).toMatchObject({ status: 'suggested', setIndex: 2 });
  expect((await api.post(`/api/v1/looks/${second.id}/restyle`, { headers: key() })).status()).toBe(
    409,
  );

  // Pass on a suggestion: it goes, with Undo.
  expect((await api.delete(`/api/v1/looks/${third.id}`)).ok()).toBe(true);
  expect((await api.post(`/api/v1/looks/${third.id}/restore`)).ok()).toBe(true);
});

test('a prompted ask makes a dated set; others can see none of it', async ({ page, browser }) => {
  await signIn(page);
  const api = page.request;
  const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const started = await api.post('/api/v1/looks/prompt', {
    data: { prompt: 'Dinner with friends, chic and easy', date },
    headers: key(),
  });
  expect(started.status()).toBe(202);
  const job = await settle(page, (await started.json()).jobId);
  const set = await (await api.get(`/api/v1/looks/sets/${job.output.setId}`)).json();
  expect(set).toMatchObject({
    mode: 'prompt',
    prompt: 'Dinner with friends, chic and easy',
    dateHint: date,
    anchor: null,
  });
  expect(set.looks.every((l: { dateHint: string }) => l.dateHint === date)).toBe(true);

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  const id = set.looks[0].id;
  expect((await otherPage.request.get(`/api/v1/looks/sets/${set.id}`)).status()).toBe(404);
  expect((await otherPage.request.get(`/api/v1/looks/${id}`)).status()).toBe(404);
  expect((await otherPage.request.post(`/api/v1/looks/${id}/save`, { data: {} })).status()).toBe(
    404,
  );
  expect((await otherPage.request.post(`/api/v1/looks/${id}/restyle`)).status()).toBe(404);
  expect((await otherPage.request.post(`/api/v1/looks/${id}/frame`)).status()).toBe(404);
  const ask = await otherPage.request.post(`/api/v1/looks/${id}/ask`, {
    data: {
      surface: 'suggested',
      text: 'tuck it',
      rack: [
        {
          key: crypto.randomUUID(),
          pieceId: null,
          proposal: { name: 'Tee', category: 'Tops', brand: '' },
        },
      ],
    },
  });
  expect(ask.status()).toBe(404);
  // Styling someone else's piece is indistinguishable from a missing one.
  const theirs = await otherPage.request.post('/api/v1/looks/generate', {
    data: { anchor: { type: 'piece', pieceId: crypto.randomUUID() } },
  });
  expect(theirs.status()).toBe(404);
  await other.close();
});

test('the look prompt returns an edit; a rule waits as a noticed line; five drafts at most', async ({
  page,
}) => {
  await signIn(page);
  const api = page.request;
  const trouser = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'White wide-leg trouser' } })
  ).json();
  const jean = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Dark straight jean' } })
  ).json();
  const draft = await api.post('/api/v1/looks', {
    data: { status: 'draft', pieces: [{ pieceId: trouser.id }] },
  });
  expect(draft.status()).toBe(201);
  const look = await draft.json();
  expect(look).toMatchObject({ status: 'draft', nameProvisional: true });

  const ask = async (text: string) => {
    const res = await api.post(`/api/v1/looks/${look.id}/ask`, {
      data: {
        surface: 'draft',
        text,
        rack: [{ key: trouser.id, pieceId: trouser.id, proposal: null }],
      },
      headers: key(),
    });
    expect(res.status()).toBe(202);
    const job = await settle(page, (await res.json()).jobId);
    return job.output.ask as Record<string, unknown>;
  };
  expect(await ask('swap the trouser for the dark straight jean')).toMatchObject({
    intent: 'swap',
    swaps: [{ key: trouser.id, to: { pieceId: jean.id, name: 'Dark straight jean' } }],
  });
  expect(await ask("I don't wear double denim")).toMatchObject({ intent: 'rule', noticed: true });
  // It waits under Robes noticed for her Keep or Not me; it is not one of her rules yet.
  const dna = await (await api.get('/api/v1/me/dna')).json();
  expect(dna.observations.map((o: { text: string }) => o.text)).toContain('No double denim');
  expect(dna.brief.rules.map((r: { text: string }) => r.text)).not.toContain('No double denim');
  // A rule never filed itself, and the look never changed.
  expect((await (await api.get(`/api/v1/looks/${look.id}`)).json()).pieces).toHaveLength(1);

  for (let i = 0; i < 4; i += 1) {
    expect(
      (await api.post('/api/v1/looks', { data: { status: 'draft', pieces: [] } })).status(),
    ).toBe(201);
  }
  const sixth = await api.post('/api/v1/looks', { data: { status: 'draft', pieces: [] } });
  expect(sixth.status()).toBe(409);
  expect((await sixth.json()).error.details).toEqual({ reason: 'drafts_full' });
  const letGo = await api.post('/api/v1/looks', {
    data: { status: 'draft', pieces: [], letGoOldest: true },
  });
  expect(letGo.status()).toBe(201);
  expect((await api.get(`/api/v1/looks/${look.id}`)).status()).toBe(404);
});
