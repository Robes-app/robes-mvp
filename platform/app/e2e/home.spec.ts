import { expect, type Page, test } from '@playwright/test';
import { Today } from '@robes/contracts';
import {
  declineConsent,
  explainError,
  isolateClientIp,
  photographedPiece,
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
  await page.getByRole('radio', { name: 'Suggested' }).click();
  const card = page.getByRole('list', { name: 'Suggested' }).getByRole('link', { name });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
});

test('day one: the band asks for a model and first pieces; each × asks once, then stands down', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const api = page.request;

  // No pieces, no model: both asks stand above the strip (design 3a).
  const band = page.getByTestId('day-one');
  await expect(band.getByRole('heading', { name: 'Choose your model' })).toBeVisible();
  await expect(band.getByRole('heading', { name: 'Add your first pieces' })).toBeVisible();
  // Create your digital twin opens the camera at once (plan 2026-11-05): a button over a hidden
  // file input that asks the phone for its front camera.
  await expect(band.getByRole('button', { name: 'Create your digital twin' })).toBeVisible();
  await expect(band.getByTestId('selfie-input')).toHaveAttribute('capture', 'user');
  await expect(band.getByRole('button', { name: /^Model \d$/ })).toHaveCount(5);
  await expect(band.getByRole('button', { name: 'Photograph tops' })).toBeVisible();
  expect(await seriousViolations(page), 'home, day one').toEqual([]);

  // A Robes model picked is remembered as a pick (plan 2026-11-05), never as skin and hair, and
  // it is the one ticked; her looks stand on it.
  await band.getByRole('button', { name: 'Model 2' }).click();
  await expect(band.getByRole('button', { name: 'Model 2', pressed: true })).toBeVisible();
  const model = await (await api.get('/api/v1/me/model')).json();
  expect(model.preset).toBe(2);
  expect(model.filed).toBe(false);
  expect(model.stand.on).toBe('robes');
  expect(model.robesModels.map((m: { id: string }) => m.id)).toEqual([
    'w-r1',
    'w-r2',
    'w-r3',
    'w-r4',
    'w-r5',
  ]);

  // × asks once; Okay folds the ask away, and it stays away.
  await band.getByRole('button', { name: 'Dismiss: Choose your model' }).click();
  await expect(
    page.getByText('You can select another model in your profile at any time.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Okay' }).click();
  await expect(band.getByRole('heading', { name: 'Choose your model' })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByTestId('day-one').getByRole('heading', { name: 'Choose your model' }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId('day-one').getByRole('heading', { name: 'Add your first pieces' }),
  ).toBeVisible();

  // A photographed piece retires the pieces ask on its own.
  await photographedPiece(page, 'Camel coat');
  await page.reload();
  await expect(page.getByTestId('day-one')).toHaveCount(0);
});

test('the diary: the strip selects a day, the slot adds and changes its look, the box dresses it', async ({
  page,
}) => {
  // The day flows, then a generation: more than the default budget.
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  for (const name of ['Office', 'Dinner']) {
    await api.post('/api/v1/looks', { data: { name, pieces: [] } });
  }
  const { date, diary } = await (await api.get('/api/v1/today')).json();
  const tomorrow = diary.days[11].date;
  const yesterday = diary.days[9].date;
  await page.goto('/');

  // Twenty-one cells, today's current; an empty day shows the dashed Add look tile.
  const cells = page.getByTestId(/^diary-day-/);
  await expect(cells).toHaveCount(21);
  await expect(page.getByTestId(`diary-day-${date}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByPlaceholder('Plan an outfit for today')).toBeVisible();
  expect(await seriousViolations(page), 'home, the diary').toEqual([]);

  // Add look → the log sheet asks what she is wearing → Pick Look → the drawer schedules one.
  await page.getByTestId('add-look').click();
  const log = page.getByRole('dialog', { name: 'What are you wearing?' });
  await expect(log.getByTestId('log-capture')).toBeVisible();
  await log.getByTestId('log-pick').click();
  const drawer = page.getByRole('dialog', { name: 'What are you wearing?' });
  await expect(drawer.getByTestId('drawer-idle')).toHaveText('Schedule Looks');
  await drawer.getByRole('button', { name: /Office/ }).click();
  await drawer.getByRole('button', { name: 'Schedule 1 Look' }).click();
  await expect(page.getByTestId('ootd-card')).toContainText('Office');
  await expect(page.getByTestId(`diary-day-${date}`)).toHaveAccessibleName('Today, 1 look planned');

  // The lookbook icon on the card changes the look: one tap replaces it.
  await page.getByRole('button', { name: 'Change the look from your lookbook' }).click();
  await expect(drawer.getByTestId('drawer-idle')).toHaveText('Tap looks to add or take off today');
  await drawer.getByRole('button', { name: /Dinner/ }).click();
  await drawer.getByRole('button', { name: 'Wear this look today' }).click();
  await expect(page.getByTestId('ootd-card')).toContainText('Dinner');
  await expect(page.getByTestId('ootd-card')).not.toContainText('Office');

  // Tomorrow: empty, the box names the day; yesterday: no box at all, the tile logs a wear.
  await page.getByTestId(`diary-day-${tomorrow}`).click();
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByPlaceholder(/^Plan an outfit for \w+day$/)).toBeVisible();
  await page.getByTestId(`diary-day-${yesterday}`).click();
  await expect(page.getByTestId('prompt-box')).toHaveCount(0);
  await page.getByTestId('add-look').click();
  await page.getByRole('dialog', { name: 'What did you wear?' }).getByTestId('log-pick').click();
  const past = page.getByRole('dialog', { name: 'What did you wear?' });
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

  // Back to today: her words make ONE draft for the day, dressing in the slot (plan 2026-11-03);
  // the box holds the thread meanwhile and never leaves home.
  await page.getByTestId(`diary-day-${date}`).click();
  const box = page.getByPlaceholder('Plan an outfit for today');
  await box.fill('Dinner with friends');
  await page.getByTestId('prompt-send').click();
  await expect(page).toHaveURL(/\/(\?day=.*)?$/);
  await expect(page.getByTestId('prompt-box')).toContainText('Dinner with friends');
  await expect(page.getByTestId('draft-tile')).toBeVisible({ timeout: 30_000 });
  await draftLanded(page, date);
  const tile = await pollUntil(
    () => slotReport(page, errors),
    (v) => v.includes('tile=ready'),
    30_000,
  );
  expect(tile, tile).toContain('tile=ready');
  await expect(page.getByTestId('prompt-box')).toContainText('Here’s a first look');
  // Her words adjust the draft from the box; View draft opens its page on the day.
  await expect(page.getByRole('button', { name: 'Dress it again' })).toBeVisible();
  await page.getByRole('button', { name: 'View draft' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}\?day=/);
  await expect(page.getByText('Draft look')).toBeVisible();
  // Save pins it to the day in the same act: home shows it as the day's card, just saved.
  await page.getByTestId('look-bar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/\?day=.*&saved=/);
  await expect(page.getByTestId('saved-badge')).toBeVisible();
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'look');
});

test('the home box: words become one draft in the slot; the hanger builds it around her pieces', async ({
  page,
}) => {
  // Two generations and a photographed piece: more than the default budget.
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  await signIn(page);
  await declineConsent(page);

  // Her words make a draft for the day, dressing in the slot; the box holds the thread.
  const { date, diary } = await (await page.request.get('/api/v1/today')).json();
  const tomorrow: string = diary.days[11].date;
  const box = page.getByPlaceholder('Plan an outfit for today');
  await box.fill('Something easy for the gallery');
  await box.press('Enter');
  await expect(page.getByTestId('draft-tile')).toBeVisible({ timeout: 30_000 });
  await draftLanded(page, date);
  const tile = await pollUntil(
    () => slotReport(page, errors),
    (v) => v.includes('tile=ready'),
    30_000,
  );
  expect(tile, tile).toContain('tile=ready');
  await expect(page.getByRole('heading', { level: 1, name: /, Niall\.$/ })).toBeVisible();
  // ↻ on the tile: another take, same brief, drawn in place.
  await page.getByRole('button', { name: 'Another take, same brief' }).click();
  await expect(page.getByTestId('draft-tile')).toHaveAttribute('data-state', 'generating');
  await expect(page.getByTestId('draft-tile')).toHaveAttribute('data-state', 'ready', {
    timeout: 60_000,
  });

  // Today's box is the draft's thread now (design 3b): no hanger until she saves or lets it go.
  await expect(page.getByTestId('prompt-box')).toHaveAttribute('data-state', 'live');
  await expect(page.getByTestId('hanger')).toHaveCount(0);

  // The hanger (design 3k), on tomorrow's empty day: pieces of hers become tokens the ask is
  // built around.
  const pieceId = await photographedPiece(page, 'Camel coat');
  await page.reload();
  await page.getByTestId(`diary-day-${tomorrow}`).click();
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'empty');
  await page.getByTestId('hanger').click();
  const flyout = page.getByTestId('wardrobe-picker');
  // The foot sits in the sheet's footer, beside the picker's list.
  await expect(page.getByTestId('flyout-idle')).toHaveText('Tap pieces to add them');
  await flyout.getByRole('button', { name: 'Include Camel coat' }).click();
  await page.getByRole('button', { name: 'Include 1 Piece' }).click();
  await expect(page.getByTestId(`piece-token-${pieceId}`)).toContainText('Camel coat');
  await expect(page.getByRole('button', { name: '1 piece to build around' })).toBeVisible();
  // A piece is an ask on its own; she has filed pieces, so the box asks where they come from.
  await page.getByTestId('prompt-send').click();
  await expect(page.getByText('Where should the pieces in your look come from?')).toBeVisible();
  await page.getByPlaceholder('Or say it your way').fill('Suggest new pieces');
  await page.getByPlaceholder('Or say it your way').press('Enter');
  // One draft tile dresses in tomorrow's slot; today keeps its own.
  await expect(page.getByTestId('draft-tile')).toHaveAttribute('data-state', 'generating', {
    timeout: 30_000,
  });
  await expect(page.getByTestId('draft-tile')).toHaveCount(1);
  await page.getByTestId(`diary-day-${date}`).click();
  await expect(page.getByTestId('draft-tile')).toHaveCount(1);
  await expect(page.getByTestId('prompt-box')).toHaveAttribute('data-state', 'live');
});
