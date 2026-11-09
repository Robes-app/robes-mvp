import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import {
  declineConsent,
  explainError,
  isolateClientIp,
  seriousViolations,
  signIn,
  styledPiece,
  uniqueEmail,
} from './helpers';

// Look states on the web (legacy beta 2026-10-06 → 10-13): a styling job lands on the keep-or-
// pass deck; a suggestion is saved as is or edited into a draft; the look prompt edits a draft.
test.beforeEach(({ context }) => isolateClientIp(context));

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

async function deckLive(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: /three ways\.$/ })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId(/^deck-card-/)).toBeVisible({ timeout: 30_000 });
}

test('a styled piece lands on the deck: keep, pass with Undo, then See Suggested', async ({
  page,
}) => {
  await signIn(page, uniqueEmail('e2e-onb'));
  await declineConsent(page);
  await styledPiece(page);
  await expect(page.getByText('From your prompt').or(page.getByText(/^Around your/))).toBeVisible({
    timeout: 30_000,
  });
  await deckLive(page);
  expect(await seriousViolations(page), 'the deck').toEqual([]);

  const first = (await page.getByTestId(/^deck-card-/).getAttribute('aria-label')) ?? '';
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(page.getByTestId(/^deck-card-/)).not.toHaveAttribute('aria-label', first);
  const second = (await page.getByTestId(/^deck-card-/).getAttribute('aria-label')) ?? '';
  await page.getByRole('button', { name: 'Pass', exact: true }).click();
  await expect(page.getByText('Passed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  // Undo puts the card back on top.
  await expect(page.getByTestId(/^deck-card-/)).toHaveAttribute('aria-label', second);
  await page.getByRole('button', { name: 'Keep', exact: true }).click();
  await page.getByRole('button', { name: 'Pass', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Two suggested looks kept.' })).toBeVisible();

  await page.getByRole('link', { name: 'See Suggested' }).click();
  await expect(page).toHaveURL(/\/looks\?tab=suggested$/);
  const grid = page.getByRole('list', { name: 'Suggested' });
  await expect(grid.getByRole('link', { name: first })).toBeVisible();
  await expect(grid.getByRole('link', { name: second })).toBeVisible();
  expect(await grid.getByRole('link').count()).toBeGreaterThanOrEqual(2);
  expect(await seriousViolations(page), 'Suggested').toEqual([]);
});

test('a suggestion is saved as is; another, edited, becomes a draft in progress', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const piece = await (
    await page.request.post('/api/v1/wardrobe/items', { data: { label: 'Navy blazer' } })
  ).json();
  await page.goto(`/piece/${piece.id}`);
  // The piece page's door opens the new-look box with the piece inside it; Send styles three
  // looks around it (the balance question went with the Shop toggle, plan 2026-11-09 R1).
  await page.getByRole('button', { name: 'Style this piece' }).click();
  await expect(page.getByTestId('box-piece')).toContainText('Navy blazer');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/looks\/style\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Around your navy blazer')).toBeVisible({ timeout: 30_000 });
  await deckLive(page);

  // A tap opens the look in its suggested state.
  const name = (await page.getByTestId(/^deck-card-/).getAttribute('aria-label')) ?? '';
  await page.getByTestId(/^deck-card-/).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Suggested · around your navy blazer')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: /^The rack · \d+ pieces$/ }),
  ).toBeVisible();
  // A piece to find shows its bag and price at the row's right; readers hear "Not yours yet".
  await expect(page.getByText('Not yours yet', { exact: false }).first()).toBeAttached();
  expect(await seriousViolations(page), 'a suggested look').toEqual([]);
  await page.getByRole('button', { name: 'Save to lookbook' }).click();
  await expect(page.getByText('Put in the diary', { exact: true })).toBeVisible();
  // Save opens the diary every time; × closes it and writes nothing.
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  // The saved look (Felix 3e): Schedule look is its one ink button.
  await expect(page.getByRole('button', { name: 'Schedule look' })).toBeVisible();

  // The piece page shows the rest of the set; Edit on one makes it a draft.
  await page.goto(`/piece/${piece.id}`);
  const rail = page.getByTestId('suggested-rail');
  await expect(rail.getByRole('link').first()).toBeVisible();
  await rail.getByRole('link').first().click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByText(/^Draft/)).toBeVisible();
  await page.goto('/looks');
  await expect(page.getByRole('link', { name: name })).toBeVisible();
  await expect(page.getByText('In progress', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Saved' }).getByRole('link')).toHaveCount(1);
});

test('a new look is a draft; the look prompt swaps a piece and names what it replaced', async ({
  page,
}) => {
  // Two asks, each a job: more than the default budget.
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 400));
  });
  page.on('pageerror', (err) => {
    void explainError(page, err).then((text) => errors.push(`pageerror: ${text}`));
  });
  await signIn(page);
  await declineConsent(page);
  for (const label of ['White wide-leg trouser', 'Dark straight jean']) {
    await page.request.post('/api/v1/wardrobe/items', { data: { label, categoryL2: 'Trousers' } });
  }
  await page.goto('/looks/new');
  // The old address lands on the draft (D14): her model in its base layer and the add slot; no
  // name field (D16: the name is the Caption in Details).
  await expect(page).toHaveURL(/\/looks\/draft\/new$/);
  await expect(page.getByLabel('Name this look')).toHaveCount(0);
  // The Rack card opens the piece picker (PRD rev 3 §4.6); Add 1 piece makes the draft.
  await page.getByRole('button', { name: 'Pick from your wardrobe' }).click();
  const picker = page.getByTestId('piece-picker');
  await picker.getByRole('button', { name: 'Include White wide-leg trouser' }).click();
  await picker.getByRole('button', { name: 'Add 1 piece' }).click();
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}$/);
  // The draft carries on in the same drawer: the piece on the rack, the styling card under it.
  await expect(page.getByText('Draft look')).toBeVisible();
  await expect(page.getByRole('list', { name: 'The rack · 1 piece' })).toBeVisible();
  // Her words go through the look prompt (plan 2026-11-03) and the picture follows (D14).
  const field = page.getByTestId('draft-prompt');
  await field.fill('swap the trouser for the dark straight jean');
  await field.press('Enter');
  await expect(
    page.getByText('Done. The change is on the look now.', { exact: false }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Swapped in · was the white wide-leg trouser')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Dark straight jean' })).toBeVisible();

  // A rule waits under Robes noticed; it changes nothing. The thread's text names what landed.
  await field.fill("I don't wear double denim");
  await field.press('Enter');
  const noticed = 'Waiting under Robes noticed — keep it there and it becomes a rule.';
  const deadline = Date.now() + 30_000;
  let thread = '';
  while (Date.now() < deadline && !thread.includes(noticed)) {
    const threads = await page.getByTestId('adjust-thread').count();
    const text = threads ? await page.getByTestId('adjust-thread').textContent() : 'no thread';
    thread = `${text} · errors: ${errors.join(' | ')}`;
    await page.waitForTimeout(500);
  }
  expect(thread, thread).toContain(noticed);
  expect(await seriousViolations(page), 'a draft with its thread').toEqual([]);

  // The done disc saves; the saved look opens with the diary up.
  await page.getByTestId('draft-done').click();
  await expect(page.getByText('Put in the diary', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.goto('/looks');
  await expect(page.getByRole('list', { name: 'Saved' }).getByRole('link')).toHaveCount(1);
  // The Front Door's filter row stands on both tabs (PRD rev 3 §5.1); there is no sort.
  await expect(page.getByRole('button', { name: /^Sort/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
  // Nothing suggested: beta's line, and the prompt (L7).
  await page.getByRole('tab', { name: 'Suggested' }).click();
  await expect(
    page.getByText('Tell Robes where you’re going, or pick a piece, and it dresses you.'),
  ).toBeVisible();
});

test('the draft look at 390: her model, the piece picker, and the done disc', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  for (const [label, categoryL2] of [
    ['White wide-leg trouser', 'Trousers'],
    ['Cream silk shirt', 'Shirts & blouses'],
  ]) {
    await page.request.post('/api/v1/wardrobe/items', { data: { label, categoryL2 } });
  }
  await page.goto('/looks/draft/new');
  // A clean screen: no header, no tab bar — the drawer's own × closes it.
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await expect(page.getByText('Draft look')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  // Nothing to keep yet: the done disc waits.
  await expect(page.getByTestId('draft-done')).toHaveAttribute('aria-disabled', 'true');
  expect(await seriousViolations(page), 'an empty draft').toEqual([]);

  // The piece picker (Felix WardrobePicker): a search, one row of pills with counts (All leads),
  // Photograph one first, a tick on every piece, Add N pieces at the foot.
  await page.getByRole('button', { name: 'Pick from your wardrobe' }).click();
  const picker = page.getByTestId('piece-picker');
  await expect(picker.getByRole('button', { name: /^All/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(picker.getByRole('button', { name: 'Photograph one' })).toBeVisible();
  await expect(picker.getByText('Adds straight in')).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Add pieces' })).toBeDisabled();
  await picker.getByRole('searchbox').fill('silk');
  await expect(picker.getByRole('button', { name: 'Include Cream silk shirt' })).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Include White wide-leg trouser' })).toBeHidden();
  expect(await seriousViolations(page), 'the piece picker').toEqual([]);
  await picker.getByRole('button', { name: 'Include Cream silk shirt' }).click();
  await picker.getByRole('button', { name: 'Add 1 piece' }).click();

  // The first piece makes the draft; it carries on in the same drawer.
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('list', { name: 'The rack · 1 piece' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await page.getByRole('button', { name: 'Pick from your wardrobe' }).click();
  await picker.getByRole('button', { name: 'Include White wide-leg trouser' }).click();
  await picker.getByRole('button', { name: 'Add 1 piece' }).click();
  await expect(page.getByRole('list', { name: 'The rack · 2 pieces' })).toBeVisible();
  await expect(page.getByText('Draft look')).toBeVisible();
  await expect(page.getByTestId('draft-done')).toHaveAttribute('aria-disabled', 'false');
  expect(await seriousViolations(page), 'a draft with two pieces').toEqual([]);
});

test('passing every card ends the deck: none kept, a way back', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/looks/style');
  await page.getByLabel('Or describe it').fill('silk scarf');
  await page.getByRole('button', { name: 'Style it' }).click();
  await deckLive(page);
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Pass', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'No suggested looks kept.' })).toBeVisible();
  await expect(page.getByTestId('deck-dressing')).toBeHidden();
  // The set refetches with no looks left; the end stays the end.
  await page.waitForTimeout(2_500);
  await expect(page.getByRole('heading', { name: 'No suggested looks kept.' })).toBeVisible();
});

test('the draft: a swap lands behind Undo, and her photograph joins its image stack', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  const ids: string[] = [];
  for (const label of ['White wide-leg trouser', 'Dark straight jean']) {
    const res = await api.post('/api/v1/wardrobe/items', {
      data: { label, categoryL2: 'Trousers' },
    });
    ids.push((await res.json()).id);
  }
  const draft = await (
    await api.post('/api/v1/looks', { data: { status: 'draft', pieces: [{ pieceId: ids[0] }] } })
  ).json();
  const read = async () => (await api.get(`/api/v1/looks/${draft.id}`)).json();
  const pieces = async () =>
    ((await read()).pieces as { piece: { id: string } }[]).map((p) => p.piece.id);

  // The old address of a draft still opens it: the one DraftLook, on its page (D14).
  await page.goto(`/look/${draft.id}`);
  await expect(page.getByText('Draft look')).toBeVisible();
  // L10: the pencil shows the hanger (plan R2); it opens the picker on the row; Swap it in lands
  // at once; Undo (6 s) puts it back.
  await page.getByRole('button', { name: 'Edit pieces' }).click();
  await page.getByRole('button', { name: 'Swap White wide-leg trouser' }).click();
  const picker = page.getByTestId('piece-picker');
  await picker.getByRole('button', { name: 'Include Dark straight jean' }).click();
  await picker.getByRole('button', { name: 'Swap it in' }).click();
  // The toast's text is also echoed in its screen-reader live region: check the first (visible) one.
  await expect(page.getByText('Dark straight jean is on the look.').first()).toBeVisible();
  await expect.poll(pieces).toEqual([ids[1]]);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(pieces).toEqual([ids[0]]);

  // D19, D20: the image stack opens the manager; Add a photo lands in the frame at once, and a
  // draft keeps it only as it is saved.
  await page.getByTestId('saved-look-stack').click();
  await expect(page.getByTestId('image-manager')).toBeVisible();
  await page.locator('input[type="file"][aria-label="Add a photo"]').setInputFiles(PHOTO);
  await expect(page.getByTestId('image-card-added')).toBeInViewport({ timeout: 30_000 });
  await page.getByTestId('image-manager-done').click();
  await expect(page.getByText('Draft look')).toBeVisible();
  expect((await read()).images, 'held until the draft is saved').toEqual([]);
  expect(await seriousViolations(page), 'a draft with her photograph').toEqual([]);
});
