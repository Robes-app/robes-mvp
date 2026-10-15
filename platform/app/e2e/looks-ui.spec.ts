import { expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn, uniqueEmail } from './helpers';

// Look states on the web (legacy beta 2026-10-06 → 10-13): a styling job lands on the keep-or-
// pass deck; a suggestion is saved as is or edited into a draft; the look prompt edits a draft.
test.beforeEach(({ context }) => isolateClientIp(context));

async function deckLive(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: /three ways\.$/ })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId(/^deck-card-/)).toBeVisible({ timeout: 30_000 });
}

test('onboarding’s first piece lands on the deck: keep, pass with Undo, then See Suggested', async ({
  page,
}) => {
  await signIn(page, uniqueEmail('e2e-onb'), 'Niall', 'white linen shirt');
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
  await page.getByRole('button', { name: 'Style this piece' }).click();
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
  await expect(page.getByText('Saved to your lookbook', { exact: true })).toBeVisible();
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
    await page.request.post('/api/v1/wardrobe/items', { data: { label } });
  }
  await page.goto('/looks/new');
  await page.getByRole('button', { name: '+ Add a piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'White wide-leg trouser' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Draft look')).toBeVisible();

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
  await expect(page.getByText('Saved to your lookbook', { exact: true })).toBeVisible();
  await page.goto('/looks');
  await expect(page.getByTestId('looks-count')).toHaveText('1 look');
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
