import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn, uniqueEmail } from './helpers';

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

test('onboarding’s first piece lands on the deck: keep, pass with Undo, then See Suggested', async ({
  page,
}) => {
  await signIn(page, uniqueEmail('e2e-onb'), 'Niall', true);
  await declineConsent(page);
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
  await expect(page.getByTestId('looks-count')).toHaveText(/2 suggested|3 suggested/);
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
  // The piece page's door opens the new-look box with the piece inside it; Send asks the one
  // question, then three looks around it.
  await page.getByRole('button', { name: 'Style this piece' }).click();
  await expect(page.getByTestId('box-piece')).toContainText('Navy blazer');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'A mix' }).click();
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
  await expect(page.getByText('Not yours yet', { exact: false }).first()).toBeVisible();
  expect(await seriousViolations(page), 'a suggested look').toEqual([]);
  await page.getByRole('button', { name: 'Save to lookbook' }).click();
  await expect(page.getByText('Put in the diary', { exact: true })).toBeVisible();
  // Save opens the diary every time; × closes it and writes nothing.
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Saved look')).toBeVisible();

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
  await expect(page.getByTestId('looks-count')).toHaveText('1 look · 1 in progress');
});

test('a new look is a draft; the look prompt swaps a piece and names what it replaced', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  for (const label of ['White wide-leg trouser', 'Dark straight jean']) {
    await page.request.post('/api/v1/wardrobe/items', { data: { label, categoryL2: 'Trousers' } });
  }
  await page.goto('/looks/new');
  // The draft stands on a figure: a slot per part of her, each opening her wardrobe.
  await expect(page.getByLabel('Name this look')).toHaveAttribute('placeholder', 'Untitled Look');
  for (const slot of ['+ Top', '+ Bottom', '+ Shoes']) {
    await expect(page.getByRole('button', { name: slot })).toBeVisible();
  }
  await page.getByRole('button', { name: '+ Bottom' }).click();
  // The sheet opens on the slot's own category.
  await page.getByRole('dialog').getByRole('button', { name: 'White wide-leg trouser' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  // The draft stays in the one composer: the slot it filled reads warm, Discard · Save at the foot.
  await expect(page.getByText('Draft look')).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Bottom' })).toHaveText('✓ Bottom');
  await page.getByRole('button', { name: 'Ask Robes about this look' }).click();

  const field = page.getByLabel('Change this draft…');
  await field.fill('swap the trouser for the dark straight jean');
  await field.press('Enter');
  await expect(
    page.getByText('Done. The change is on the look now.', { exact: false }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Swapped in · was the white wide-leg trouser')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Dark straight jean' })).toBeVisible();

  // A rule waits under Robes noticed; it changes nothing.
  await page.getByLabel('Anything else, or put something back…').fill("I don't wear double denim");
  await page.getByLabel('Anything else, or put something back…').press('Enter');
  await expect(
    page.getByText('Waiting under Robes noticed — keep it there and it becomes a rule.'),
  ).toBeVisible({ timeout: 30_000 });
  expect(await seriousViolations(page), 'a draft with the prompt open').toEqual([]);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Put in the diary', { exact: true })).toBeVisible();
  await page.goto('/looks');
  await expect(page.getByTestId('looks-count')).toHaveText('1 look');
});

test('the draft look at 390: her model, the wardrobe sheet, and Discard · Save at the foot', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  for (const [label, categoryL2] of [
    ['White wide-leg trouser', 'Trousers'],
    ['Cream silk shirt', 'Shirts & blouses'],
  ]) {
    await page.request.post('/api/v1/wardrobe/items', { data: { label, categoryL2 } });
  }
  await page.goto('/looks/new');
  // A clean screen: no header, no tab bar — the footer closes it.
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await expect(page.getByText('Draft look')).toBeVisible();
  await expect(page.getByText('The look · 0 pieces')).toBeVisible();
  const bar = page.getByTestId('look-bar');
  await expect(bar.getByRole('button', { name: 'Discard' })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  const box = await bar.boundingBox();
  expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(844);

  // The slot's sheet: titled for the slot, a search, one row of chips, Photograph one first.
  await page.getByRole('button', { name: '+ Shoes' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add shoes' });
  await expect(sheet.getByText('From your wardrobe')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Shoes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(sheet.getByRole('button', { name: 'Photograph one' })).toBeVisible();
  await expect(sheet.getByText('Files straight in')).toBeVisible();
  await sheet.getByRole('searchbox').fill('silk');
  await expect(sheet.getByRole('button', { name: 'Cream silk shirt' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'White wide-leg trouser' })).toBeHidden();
  expect(await seriousViolations(page), 'the wardrobe sheet').toEqual([]);
  await sheet.getByRole('button', { name: 'Cream silk shirt' }).click();

  // The first piece makes the draft; it carries on in the same composer.
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByText('The look · 1 piece')).toBeVisible();
  // Picked from + Shoes, the shirt lands in its own slot.
  await expect(page.getByRole('button', { name: '+ Top' })).toHaveText('✓ Top');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await page.getByRole('button', { name: '+ Bottom' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'White wide-leg trouser' }).click();
  await expect(page.getByText('The look · 2 pieces')).toBeVisible();
  await expect(page.getByText('Draft look')).toBeVisible();
  await expect(
    page.getByTestId('look-bar').getByRole('button', { name: 'Save', exact: true }),
  ).toBeEnabled();
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

test('the draft: a swap lands behind Undo, and her photograph is added from the canvas', async ({
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
  const pieces = async () =>
    (
      (await (await api.get(`/api/v1/looks/${draft.id}`)).json()).pieces as {
        piece: { id: string };
      }[]
    ).map((p) => p.piece.id);

  await page.goto(`/look/${draft.id}`);
  await expect(page.getByText('Draft look')).toBeVisible();
  // L10: the swap lands at once; Undo (6 s) puts the rack back.
  await page.getByRole('button', { name: 'Swap White wide-leg trouser' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dark straight jean' }).click();
  // The toast's text is also echoed in its screen-reader live region: check the first (visible) one.
  await expect(page.getByText('Dark straight jean is on the look.').first()).toBeVisible();
  await expect.poll(pieces).toEqual([ids[1]]);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(pieces).toEqual([ids[0]]);

  // L4: the camera on the canvas adds her photograph to the draft; it stays in the composer,
  // You · Model stands under the canvas, and the camera becomes ↻.
  await expect(page.getByRole('radiogroup', { name: 'The record of this look' })).toBeHidden();
  await page.locator('input[type="file"][aria-label="Add your photograph"]').setInputFiles(PHOTO);
  const record = page.getByRole('radiogroup', { name: 'The record of this look' });
  await expect(record).toBeVisible({ timeout: 30_000 });
  await expect(record.getByRole('radio', { name: 'You' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Replace your photograph' })).toBeVisible();
  await expect(page.getByText('Draft look')).toBeVisible();
  expect(
    (await (await api.get(`/api/v1/looks/${draft.id}`)).json()).photo,
    'her photograph is on the draft',
  ).not.toBeNull();
  expect(await seriousViolations(page), 'a draft with her photograph').toEqual([]);
});
