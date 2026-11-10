import { expect, type Page, test } from '@playwright/test';
import { Today } from '@robes/contracts';
import {
  declineConsent,
  explainError,
  isolateClientIp,
  seriousViolations,
  signIn,
  styledPiece,
  uniqueEmail,
} from './helpers';
import { latestCodeFor } from './mailpit';

// The modular home (legacy 0478e63 → f044b35): onboarding lands on the deck, home stacks its
// modules by her activation, the box asks for a new look (by words, by a day, by a piece).
test.beforeEach(({ context }) => isolateClientIp(context));

async function deckLive(page: Page): Promise<void> {
  await expect(page.getByTestId(/^deck-card-/)).toBeVisible({ timeout: 30_000 });
}

// The draft Robes is making for a day (plan 2026-11-03): its job followed through the API until
// it ends, so a tile that never settles says why.
type DayDraft = {
  jobId: string | null;
  look: { id: string; framePending: boolean; image: unknown } | null;
} | null;
async function readDraft(page: Page, date: string): Promise<DayDraft> {
  const today = await (await page.request.get('/api/v1/today')).json();
  // The client parses every response with the contract: what the server sends must pass it.
  const parsed = Today.safeParse(today);
  expect(parsed.success, JSON.stringify(parsed.error?.issues ?? null)).toBe(true);
  return today.diary.days.find((d: { date: string }) => d.date === date)?.draft ?? null;
}

// Polls a reading until it matches or the time runs out; the last reading is in the failure.
async function pollUntil(
  read: () => Promise<string>,
  ok: (value: string) => boolean,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    last = await read();
    if (ok(last)) return last;
    await new Promise((r) => setTimeout(r, 500));
  }
  return last;
}

// Browser-side errors while a test runs, and every answer to the diary read, read back when an
// expectation fails.
function watchErrors(page: Page): string[] {
  const seen: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') seen.push(msg.text().slice(0, 400));
  });
  page.on('pageerror', (err) => {
    void explainError(page, err).then((text) => seen.push(`pageerror: ${text}`));
  });
  page.on('requestfailed', (req) => seen.push(`failed: ${req.url()} ${req.failure()?.errorText}`));
  page.on('response', (res) => {
    if (!res.url().includes('/api/v1/today')) return;
    void res
      .json()
      .then((body) => {
        const days = body?.diary?.days ?? [];
        const drafts = days
          .filter((d: { draft: unknown }) => d.draft)
          .map(
            (d: { date: string; draft: { jobId: string | null; look: { id: string } | null } }) =>
              `${d.date}:job=${d.draft.jobId ? 'on' : 'off'}:look=${d.draft.look ? 'yes' : 'no'}`,
          );
        seen.push(`today ${res.status()} [${drafts.join(',')}]`);
      })
      .catch(() => seen.push(`today ${res.status()} unreadable`));
  });
  return seen;
}

// What the browser itself sees in the slot and from the diary read, for a failure's message.
async function slotReport(page: Page, errors: string[]): Promise<string> {
  const state = await page.getByTestId('day-slot').getAttribute('data-state');
  const tiles = await page.getByTestId('draft-tile').count();
  const tile = tiles ? await page.getByTestId('draft-tile').getAttribute('data-state') : 'none';
  return `slot=${state} tile=${tile} · ${errors.slice(-12).join(' | ')}`;
}
async function draftLanded(page: Page, date: string): Promise<void> {
  const api = page.request;
  await expect.poll(() => readDraft(page, date), { timeout: 15_000 }).not.toBeNull();
  const jobId = (await readDraft(page, date))?.jobId;
  if (jobId) {
    let snap: { status: string; error: string | null } = { status: 'queued', error: null };
    await expect
      .poll(
        async () => {
          snap = await (await api.get(`/api/v1/jobs/${jobId}`)).json();
          return snap.status;
        },
        { timeout: 45_000 },
      )
      .toMatch(/succeeded|partial|failed|cancelled/);
    expect(snap.status, JSON.stringify(snap)).toMatch(/succeeded|partial/);
  }
  await expect
    .poll(
      async () => {
        const d = await readDraft(page, date);
        return d
          ? `job=${d.jobId} look=${d.look?.id ?? null} framePending=${d.look?.framePending} image=${d.look?.image !== null}`
          : 'none';
      },
      { timeout: 30_000 },
    )
    .toMatch(/^job=null look=[0-9a-f-]+ framePending=false/);
}

// Getting to know you (handoff 30 Oct): name and identity are required; styles, brands and
// colours may be left empty; Back keeps every answer; Get started files them all and lands home.
test('onboarding: name, identity, styles, brands and colours, saved once, then home', async ({
  page,
}) => {
  const email = uniqueEmail('e2e-home-onb');
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('Code').fill(await latestCodeFor(email));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  const next = page.getByRole('button', { name: 'Continue' });
  const title = (name: string) => page.getByRole('heading', { level: 1, name });
  await page.getByLabel('First name').fill('Annie');
  await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
  expect(await seriousViolations(page), 'onboarding, name').toEqual([]);
  await next.click();

  await expect(title('How do you identify?')).toBeVisible();
  await expect(next).toBeDisabled();
  await page.getByRole('radio', { name: 'Man', exact: true }).click();
  await expect(next).toBeEnabled();
  expect(await seriousViolations(page), 'onboarding, identity').toEqual([]);
  await next.click();

  await expect(title('Which styles feel like you?')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Love / })).toHaveCount(8);
  await page.getByRole('button', { name: 'Love Utility' }).click();
  await page.getByRole('button', { name: 'Love Heritage' }).click();
  expect(await seriousViolations(page), 'onboarding, styles').toEqual([]);
  // Back keeps her answers.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('radio', { name: 'Man', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await next.click();
  await expect(page.getByRole('button', { name: 'Love Utility', pressed: true })).toBeVisible();
  await next.click();

  // The design's eighteen lead; then a man's Utility and Heritage houses, in her tap order.
  await expect(title('Any favourite brands?')).toBeVisible();
  const tiles = page.getByRole('list').getByRole('button');
  await expect(tiles).toHaveCount(31);
  await expect(tiles.first()).toHaveText('Totême');
  await expect(tiles.nth(18)).toHaveText('Stone Island');
  await page.getByRole('button', { name: 'Barbour' }).click();
  expect(await seriousViolations(page), 'onboarding, brands').toEqual([]);
  await next.click();

  await expect(title('Colours you love or avoid.')).toBeVisible();
  const blacks = page.getByRole('radiogroup', { name: 'Blacks: love, no view or avoid' });
  await blacks.getByRole('radio', { name: 'Love' }).click();
  const pinks = page.getByRole('radiogroup', { name: 'Pinks: love, no view or avoid' });
  await pinks.getByRole('radio', { name: 'Avoid' }).click();
  expect(await seriousViolations(page), 'onboarding, colours').toEqual([]);
  await page.getByRole('button', { name: 'Get started' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /, Annie\.$/ })).toBeVisible();
  const dna = await (await page.request.get('/api/v1/me/dna')).json();
  expect(dna).toMatchObject({
    types: ['Utility', 'Heritage'],
    brands: ['Barbour'],
    gender: 'man',
  });
  const style = await (await page.request.get('/api/v1/me/style')).json();
  expect(style.palette.fam).toEqual({ blacks: 1, pinks: -1 });
});

test('a styled piece lands on the deck and home carries it on', async ({ page }) => {
  await signIn(page, uniqueEmail('e2e-home-deck'), 'Annie');
  await declineConsent(page);
  await styledPiece(page);
  await expect(page.getByText(/^Around your/)).toBeVisible({ timeout: 30_000 });
  await deckLive(page);

  const name = (await page.getByTestId(/^deck-card-/).getAttribute('aria-label')) ?? '';

  // Home is the diary (design 3k): the suggestion waits in the Lookbook, one tap from the dock,
  // and its card opens the look (68ff778), never an empty composer.
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /, Annie\.$/ })).toBeVisible();
  await expect(page.getByTestId('diary-strip')).toBeVisible();
  await page.getByRole('link', { name: 'Lookbook' }).first().click();
  await page.getByRole('tab', { name: 'Suggested' }).click();
  const card = page.getByRole('list', { name: 'Suggested' }).getByRole('link', { name });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
});

test('an empty day: her model with Capture · Describe · Pick; the model stack opens Your model', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const api = page.request;

  // Felix 3a: no look, so the day is her model with the three ways in.
  const add = page.getByTestId('add-page');
  await expect(add.getByRole('button', { name: 'Describe a look for today' })).toBeVisible();
  await expect(add.getByRole('button', { name: 'Pick a look for today' })).toBeVisible();
  // Capture is the camera itself: a hidden file input under the disc.
  await expect(add.getByLabel('Photograph a look for today')).toHaveAttribute(
    'capture',
    'environment',
  );
  expect(await seriousViolations(page), 'home, day one').toEqual([]);

  // Home holds no prompt box (3a, D22): Describe opens the Draft look drawer for the day, at
  // rest (nothing focused), with the day's place chip in its prompt card. Closing it untouched
  // leaves nothing behind.
  await expect(page.getByTestId('prompt-box')).toHaveCount(0);
  await add.getByRole('button', { name: 'Describe a look for today' }).click();
  await expect(page).toHaveURL(/\/looks\/draft\/new\?day=/);
  const drawer = page.getByTestId('draft-look');
  await expect(drawer.getByText('Draft look')).toBeVisible();
  await expect(drawer.getByTestId('draft-prompt')).not.toBeFocused();
  await expect(drawer.getByTestId('draft-context')).toBeVisible();
  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toHaveCount(0);
  expect((await (await api.get('/api/v1/looks?status=draft')).json()).items).toEqual([]);

  // On a Robes model, the stack opens Your model; a pick is remembered as a pick (D10).
  await add.getByRole('button', { name: 'Choose your model' }).click();
  const picker = page.getByTestId('model-picker');
  await expect(picker.getByRole('button', { name: /^Model \d$/ })).toHaveCount(5);
  await expect(picker.getByRole('button', { name: 'Use my likeness' })).toBeVisible();
  await picker.getByRole('button', { name: 'Model 2' }).click();
  await expect(picker.getByRole('button', { name: 'Model 2', pressed: true })).toBeVisible();
  const model = await (await api.get('/api/v1/me/model')).json();
  expect(model.preset).toBe(2);
  expect(model.stand.on).toBe('robes');
});

test('the diary: the strip selects a day, the slot adds and changes its look, Describe drafts it', async ({
  page,
}) => {
  // The day flows, then a generation: more than the default budget.
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  for (const name of ['Office', 'Dinner']) {
    await api.post('/api/v1/looks', { data: { name, pieces: [] } });
  }
  const { date, diary } = await (await api.get('/api/v1/today')).json();
  const at = diary.days.findIndex((d: { date: string }) => d.date === date);
  const tomorrow = diary.days[at + 1].date;
  const yesterday = diary.days[at - 1].date;
  await page.goto('/');

  // Twenty-one cells, today's current; an empty day is her model with the three ways in.
  const cells = page.getByTestId(/^diary-day-/);
  await expect(cells).toHaveCount(21);
  await expect(page.getByTestId(`diary-day-${date}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByTestId('disc-describe')).toBeVisible();
  expect(await seriousViolations(page), 'home, the diary').toEqual([]);

  // Pick → the drawer asks what she is wearing and schedules one (Front Door PRD rev 3 §4.5):
  // the ✓ waits grey until her picks change the day; the filter row and search sit under the
  // question.
  await page.getByRole('button', { name: 'Pick a look for today' }).click();
  const drawer = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'What are you wearing?' }),
  });
  await expect(drawer.getByTestId('drawer-done')).toHaveAttribute('aria-disabled', 'true');
  await expect(drawer.getByRole('button', { name: 'Filter' })).toBeVisible();
  await expect(drawer.getByRole('searchbox', { name: 'Search your looks' })).toBeVisible();
  await drawer.getByRole('button', { name: /Office/ }).click();
  await drawer.getByRole('button', { name: 'Schedule 1 Look' }).click();
  await expect(page.getByTestId('ootd-card')).toContainText('Office');
  await expect(page.getByTestId(`diary-day-${date}`)).toHaveAccessibleName('Today, 1 look planned');

  // Swap opens the same sheet with the day's look ticked: untick it, tick another, ✓.
  await page.getByRole('button', { name: 'Swap Office for another look' }).click();
  await expect(drawer.getByText('Scheduled')).toHaveCount(1);
  await drawer.getByRole('button', { name: /Office/ }).click();
  await drawer.getByRole('button', { name: /Dinner/ }).click();
  await drawer.getByRole('button', { name: 'Wear this look today' }).click();
  await expect(page.getByTestId('ootd-card')).toContainText('Dinner');
  await expect(page.getByTestId('ootd-card')).not.toContainText('Office');
  // Edit opens the Edit look drawer over the day (3k, D18): 3e inside, Update look at its foot,
  // dimmed until something changes; the tick closes while nothing waits.
  await page.getByRole('link', { name: 'Edit Dinner' }).click();
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}\?day=/);
  await expect(page.getByTestId('draft-look')).toBeVisible();
  await expect(page.getByText('Edit look')).toBeVisible();
  await expect(page.getByTestId('update-look')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('draft-done')).toHaveAttribute('aria-disabled', 'false');
  await page.getByTestId('draft-done').click();
  await expect(page.getByTestId('draft-look')).toHaveCount(0);

  // Tomorrow: empty, Describe is there; yesterday: no Describe, the tile logs a wear.
  await page.getByTestId(`diary-day-${tomorrow}`).click();
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByTestId('disc-describe')).toBeVisible();
  await page.getByTestId(`diary-day-${yesterday}`).click();
  await expect(page.getByTestId('disc-describe')).toHaveCount(0);
  await page.getByRole('button', { name: /^Pick a look for \w+day$/ }).click();
  const past = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'What did you wear?' }),
  });
  await past.getByRole('button', { name: /Office/ }).click();
  await past.getByRole('button', { name: 'Schedule 1 Look' }).click();
  await expect(page.getByTestId('ootd-card')).toContainText('Office');
  const wears = await (
    await api.get(
      `/api/v1/looks/${(await (await api.get('/api/v1/looks')).json()).items.find((l: { name: string }) => l.name === 'Office').id}/wears`,
    )
  ).json();
  expect(wears.items.map((w: { wornOn: string }) => w.wornOn)).toContain(yesterday);

  // × takes the worn look off the day, with Undo.
  await page.getByRole('button', { name: /^Take Office off/ }).click();
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'empty');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('ootd-card')).toContainText('Office');

  // Back to today: Describe, and her words make ONE draft for the day (plan 2026-11-03, D22);
  // the drawer carries on with it once it is made.
  await page.getByTestId(`diary-day-${date}`).click();
  await page.getByTestId('disc-describe').click();
  await page.getByTestId('draft-prompt').fill('Dinner with friends');
  await page.getByTestId('draft-generate').click();
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}\?day=/, { timeout: 30_000 });
  await expect(page.getByTestId('draft-look')).toBeVisible();
  await expect(page.getByText('Draft look')).toBeVisible();
  // The done disc saves and pins it to the day in the same act: home shows it as the day's card.
  await page.getByTestId('draft-done').click();
  await expect(page).toHaveURL(/\/\?day=.*&saved=/);
  await expect(page.getByTestId('saved-badge')).toBeVisible();
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'look');
});

test('Describe: her words become the day’s one draft, which dresses in the slot', async ({
  page,
}) => {
  // A generation and its picture: more than the default budget.
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await signIn(page);
  await declineConsent(page);

  // Her words in the drawer make a draft for the day; closed, it dresses in the slot.
  const { date } = await (await page.request.get('/api/v1/today')).json();
  await page.getByTestId('disc-describe').click();
  await page.getByTestId('draft-prompt').fill('Something easy for the gallery');
  await page.getByTestId('draft-generate').click();
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}\?day=/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Keep for later' }).click();
  await expect(page.getByTestId('draft-tile')).toBeVisible({ timeout: 30_000 });
  await draftLanded(page, date);
  const tile = await pollUntil(
    () => slotReport(page, errors),
    (v) => v.includes('tile=ready'),
    30_000,
  );
  expect(tile, tile).toContain('tile=ready');
  await expect(page.getByRole('heading', { level: 1, name: /, Niall\.$/ })).toBeVisible();
  // Nothing sits on the draft's picture, and Home lists no jobs under it (design 1b).
  await expect(page.getByTestId('draft-tile').getByRole('button')).toHaveCount(0);
  await expect(page.getByText('In the studio')).toHaveCount(0);
});
