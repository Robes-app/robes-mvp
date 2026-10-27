import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import {
  declineConsent,
  isolateClientIp,
  PHOTO,
  seriousViolations,
  signIn,
  uniqueEmail,
} from './helpers';

// The modular home (legacy 0478e63 → f044b35): onboarding lands on the deck, home stacks its
// modules by her activation, the box asks for a new look (by words, by a day, by a piece).
test.beforeEach(({ context }) => isolateClientIp(context));

const BYTES = readFileSync(PHOTO);

async function photographedPiece(page: Page, label: string): Promise<string> {
  const api = page.request;
  const { assetId, upload } = await (
    await api.post('/api/v1/uploads', {
      data: { kind: 'wardrobe', contentType: 'image/jpeg', bytes: BYTES.length },
    })
  ).json();
  await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: BYTES });
  expect((await api.post(`/api/v1/uploads/${assetId}/complete`)).ok()).toBe(true);
  const piece = await (
    await api.post('/api/v1/wardrobe/items', { data: { label, imageAssetId: assetId } })
  ).json();
  return piece.id;
}

async function deckLive(page: Page): Promise<void> {
  await expect(page.getByTestId(/^deck-card-/)).toBeVisible({ timeout: 30_000 });
}

test('onboarding: splash → name → the first piece read live → Composing → the deck, back home', async ({
  page,
}) => {
  await signIn(page, uniqueEmail('e2e-home-onb'), 'Annie', true);
  await declineConsent(page);
  await expect(page.getByText(/^Around your/)).toBeVisible({ timeout: 30_000 });
  await deckLive(page);

  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /, Annie\.$/ })).toBeVisible();
  await expect(page.getByText('What are you dressing for today?')).toBeVisible();
  // Three pieces filed (the one styled, the others quietly): Style DNA leads; the map carries the
  // rest; the deck's looks wait in Suggested.
  await expect(page.getByText('Next · Style DNA')).toBeVisible();
  const map = page.getByRole('region', { name: 'Getting to know you' });
  await expect(map.getByText('Three pieces filed')).toBeVisible();
  const suggested = page.getByTestId('home-suggested');
  const card = suggested.getByRole('listitem').first().getByRole('link');
  await expect(card).toBeVisible();
  // A home Suggested card opens its look (68ff778), never an empty composer.
  await card.click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
});

test('the home walks its stages: one door, Later, the map, then the activated week', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const api = page.request;

  // Stage 1: the empty Style DNA card is one door, the one ink on home.
  const door = page.getByRole('link', { name: 'Log your style notes' });
  await expect(door).toHaveAttribute('href', '/you/style');
  await expect(page.getByPlaceholder('Where to, and how should it feel?')).toBeVisible();
  const map = page.getByRole('region', { name: 'Getting to know you' });
  await expect(map.getByRole('listitem')).toHaveText([
    /Your digital twin\s*Two photographs/,
    /Your wardrobe\s*Nothing filed yet/,
    /Your first look\s*From your own pieces/,
  ]);
  expect(await seriousViolations(page), 'home, stage 1').toEqual([]);

  // Later snoozes Style DNA for a day: the twin leads, the style waits in the map.
  await page.getByRole('button', { name: 'Later' }).click();
  await expect(page.getByText('Next · Your digital twin')).toBeVisible();
  await expect(map.getByText('A brand, an icon, a style')).toBeVisible();
  // A tapped open row expands its module for the session.
  await map.getByRole('button', { name: /Your first look/ }).click();
  await expect(page.getByText('Next · Your first look')).toBeVisible();

  // Two rows filled confirm the style; a model on file retires the twin; the wardrobe leads.
  await api.patch('/api/v1/me/dna', { data: { brands: ['The Row'], icons: ['Jane Birkin'] } });
  await api.patch('/api/v1/me/model', { data: {} });
  await page.reload();
  await expect(page.getByText('Next · Your wardrobe')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your wardrobe starts here.' })).toBeVisible();
  await expect(map.getByText('Filed under Style DNA')).toBeVisible();

  const ids: string[] = [];
  for (const label of ['Camel coat', 'Cream knit', 'Straight jeans', 'Loafers', 'Silk scarf']) {
    ids.push(await photographedPiece(page, label));
  }
  await page.reload();
  // Five photographed: the first look leads, three candidates, the first picked.
  await expect(page.getByText('Next · Your first look')).toBeVisible();
  const build = page.getByRole('link', { name: 'Build the look' });
  await expect(build).toHaveAttribute('href', /\/looks\/new\?pieceId=/);
  await expect(page.getByRole('button', { pressed: true, name: /^Build around/ })).toHaveCount(1);

  // A look from her own pieces activates home: the week, the contextual box, no map.
  await api.post('/api/v1/looks', {
    data: { name: 'The mine one', pieces: ids.slice(0, 3).map((pieceId) => ({ pieceId })) },
  });
  await page.reload();
  await expect(page.getByTestId('home-week')).toBeVisible();
  await expect(page.getByPlaceholder('Where to, and how should it feel?')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Getting to know you' })).toHaveCount(0);
  await expect(
    page.getByTestId('home-saved').getByRole('link', { name: 'The mine one' }),
  ).toBeVisible();
  expect(await seriousViolations(page), 'home, activated').toEqual([]);

  // The strip selects; an unplanned day's card dresses it — the box on that date, then the deck.
  const cells = page.getByTestId('home-week').getByRole('button', { pressed: false });
  await cells.nth(2).click();
  const card = page.getByTestId('day-card');
  await expect(card).toHaveAttribute('data-state', 'empty');
  await expect(card).toContainText(/^.*Dress \w+day/);
  await card.click();
  const box = page.getByPlaceholder(/^Dress \w{3} \d{1,2} \w{3}…$/);
  await expect(box).toBeFocused();
  await box.fill('Dinner with friends');
  await box.press('Enter');
  // She has filed pieces: the box asks once where the look's pieces come from.
  await expect(page.getByText('Where should the pieces in your look come from?')).toBeVisible();
  await page.getByRole('button', { name: 'A mix' }).click();
  await expect(page).toHaveURL(/\/looks\/style\/[0-9a-f-]{36}\?from=home$/);
  await expect(page.getByText(/^For \w{3} \d{1,2} \w{3}$/)).toBeVisible({ timeout: 30_000 });
});

test('the home box: words become three looks on the deck; a photographed piece styles three ways', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);

  const box = page.getByPlaceholder('Where to, and how should it feel?');
  await box.fill('Something easy for the gallery');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/looks\/style\/[0-9a-f-]{36}\?from=home$/);
  await expect(page.getByText('From your prompt')).toBeVisible({ timeout: 30_000 });
  await deckLive(page);
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(
    page.getByTestId('home-suggested').getByText('From your prompt').first(),
  ).toBeVisible();

  // The + inside the box: a photograph files quietly inside the box, and is the ask on its own.
  await page.getByRole('button', { name: 'Add a piece' }).click();
  await expect(page.getByRole('menuitem', { name: /Take a picture/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /From your wardrobe/ })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: /Upload a photo/ }).click();
  await (await chooser).setFiles(PHOTO);
  const piece = page.getByTestId('box-piece');
  await expect(piece).toContainText('filed to your wardrobe', { timeout: 30_000 });
  // Once filed the line asks where the piece is going ("Style this t-shirt for…").
  await expect(page.getByPlaceholder(/^Style th(is|ese) .+ for…$/)).toBeVisible();
  await page.getByRole('button', { name: 'Send' }).click();
  // Her answer can be her own words in the field.
  await page.getByPlaceholder('Or say it your way').fill('Suggest new pieces');
  await page.getByPlaceholder('Or say it your way').press('Enter');
  await expect(page).toHaveURL(/\/looks\/style\/[0-9a-f-]{36}\?from=home$/);
  await expect(page.getByText(/^Around your/)).toBeVisible({ timeout: 30_000 });
});
