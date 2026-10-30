import { gunzipSync } from 'node:zlib';
import { expect, type Page, type Request, test } from '@playwright/test';
import { isolateClientIp, photographedPiece, signIn } from './helpers';

// The EU ingest host and its assets host (remote config); both must stay silent before consent.
const POSTHOG = /^https:\/\/eu(-assets)?\.i\.posthog\.com\//;

test.beforeEach(({ context }) => isolateClientIp(context));

// Every request to PostHog is recorded (and answered locally) so the test can prove none happen early.
async function watchPostHog(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.context().route(POSTHOG, (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return hits;
}

function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

type Captured = { event: string; properties: Record<string, unknown> };

// The events in one PostHog ingest request (gzip-js, base64 `data=` or plain JSON).
function eventsIn(req: Request): Captured[] {
  const buf = req.postDataBuffer();
  if (!buf?.length) return [];
  let text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString() : buf.toString();
  if (text.startsWith('data=')) {
    text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString();
  }
  try {
    const body = JSON.parse(text) as unknown;
    const list = Array.isArray(body) ? body : ((body as { batch?: unknown[] }).batch ?? [body]);
    return (list as Captured[]).filter((e) => typeof e?.event === 'string');
  } catch {
    return [];
  }
}

// Every event PostHog is sent, as it is sent.
async function watchEvents(page: Page): Promise<{ hits: string[]; events: Captured[] }> {
  const hits: string[] = [];
  const events: Captured[] = [];
  await page.context().route(POSTHOG, (route) => {
    hits.push(route.request().url());
    events.push(...eventsIn(route.request()));
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return { hits, events };
}

// A piece's door → the one question → the deck → the first look, saved and put in today's diary.
async function saveALook(page: Page): Promise<void> {
  const piece = await (
    await page.request.post('/api/v1/wardrobe/items', { data: { label: 'Navy blazer' } })
  ).json();
  await page.goto(`/piece/${piece.id}`);
  await page.getByRole('button', { name: 'Style this piece' }).click();
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'A mix' }).click();
  await expect(page.getByTestId(/^deck-card-/)).toBeVisible({ timeout: 30_000 });
  await page.getByTestId(/^deck-card-/).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await page.getByRole('button', { name: 'Save to lookbook' }).click();
  await page.getByRole('button', { name: 'Put it in the diary' }).click();
  await expect(page.getByText(/is in your diary for/).first()).toBeVisible();
}

const banner = (page: Page) => page.getByRole('region', { name: 'Help shape Robes.' });

// The ask waits for her first real moment: a filed piece.
async function signInWithPiece(page: Page): Promise<void> {
  await signIn(page);
  await photographedPiece(page, 'Cream long-sleeve t-shirt');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /, Niall\.$/ })).toBeVisible();
}

test('the ask never meets her before a piece is filed', async ({ page }) => {
  await signIn(page);
  await page.waitForLoadState('networkidle');
  await expect(banner(page)).toHaveCount(0);
});

test('declining hides the banner for good and nothing reaches PostHog', async ({ page }) => {
  const hits = await watchPostHog(page);
  await signInWithPiece(page);
  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole('button')).toHaveText(['Don’t allow', 'Allow']);

  await banner(page).getByRole('button', { name: 'Don’t allow' }).focus();
  await page.keyboard.press('Enter');
  await expect(banner(page)).toBeHidden();

  await page.reload();
  await expect(page.getByRole('heading', { name: /, Niall\.$/ })).toBeVisible();
  await expect(banner(page)).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(hits).toEqual([]);
  expect(await (await page.request.get('/api/v1/me/consents')).json()).toMatchObject({
    analytics: false,
  });
});

test('accepting starts PostHog only then, persists, and can be withdrawn', async ({ page }) => {
  const hits = await watchPostHog(page);
  const violations = watchCsp(page);
  await signInWithPiece(page);
  // A full load settles to network idle (a client-side navigation doesn't report it reliably).
  await page.reload();
  await expect(banner(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(hits, 'PostHog was contacted before consent').toEqual([]);

  await banner(page).getByRole('button', { name: 'Allow', exact: true }).click();
  await expect(banner(page)).toBeHidden();
  await expect.poll(() => hits.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: /, Niall\.$/ })).toBeVisible();
  await expect(banner(page)).toBeHidden();
  expect(await (await page.request.get('/api/v1/me/consents')).json()).toMatchObject({
    analytics: true,
    replay: null,
  });

  await page.goto('/you/privacy');
  const usage = page.getByRole('switch', { name: /Usage counts/ });
  await expect(usage).toBeChecked();
  await usage.uncheck();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  await expect(page.getByRole('switch', { name: /Screen recordings/ })).toBeDisabled();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /, Niall\.$/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
  const afterWithdrawal = hits.length;
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(hits.length, 'PostHog was contacted after consent was withdrawn').toBe(afterWithdrawal);
  expect(violations).toEqual([]);
});

test.describe('product events', () => {
  // posthog-js drops a headless, automated browser's events as a bot's (its user agent, its
  // userAgentData brands and navigator.webdriver); this browser reads as a person's.
  test.use({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  });
  test.beforeEach(({ page }) =>
    page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    }),
  );

  test('after consent, product events carry the catalogue props; before it, nothing is sent', async ({
    page,
  }) => {
    const { hits, events } = await watchEvents(page);
    await signIn(page);
    // Not yet answered: the whole flow sends nothing.
    await saveALook(page);
    await page.waitForLoadState('networkidle');
    expect(hits, 'PostHog was contacted before consent').toEqual([]);

    const res = await page.request.post('/api/v1/me/consents', {
      data: { source: 'web', consents: { analytics: true } },
    });
    expect(res.ok()).toBe(true);
    await page.reload();
    await saveALook(page);
    const sent = (name: string) => events.filter((e) => e.event === name).map((e) => e.properties);
    await expect.poll(() => sent('look_created').length, { timeout: 20_000 }).toBe(1);
    expect(sent('look_created')[0]).toMatchObject({
      from: 'suggested',
      pieces: expect.any(Number),
      proposed: expect.any(Number),
      anchored: true,
    });
    await expect.poll(() => sent('look_pinned').length, { timeout: 20_000 }).toBe(1);
    expect(sent('look_pinned')[0]).toMatchObject({ offset_from_today: 0 });
    expect(sent('balance_asked')[0]).toMatchObject({ surface: 'create', piece: true });
    expect(sent('balance_answered')[0]).toMatchObject({ surface: 'create', balance: 'mix' });
    expect(sent('prompt_submitted')[0]).toMatchObject({
      surface: 'create',
      intent: 'piece',
      scope: 'none',
      ok: true,
    });
    // Ids, counts and enums only: never a piece's name or her words (PostHog's own $ fields aside).
    const ours = events
      .filter((e) => !e.event.startsWith('$'))
      .map((e) => Object.entries(e.properties).filter(([k]) => !k.startsWith('$')));
    expect(JSON.stringify(ours)).not.toMatch(/navy blazer/i);
  });
});
