import { expect, type Page, test } from '@playwright/test';
import {
  declineConsent,
  isolateClientIp,
  photographedPiece,
  seriousViolations,
  signIn,
} from './helpers';

// Style a piece → draft look (handoff 24 Nov): the sparkle on a piece she owns opens the draft
// look's bar with the piece as a chip; a send makes one draft styled around it, which saves to
// the Lookbook and goes back to the piece, or is let go and goes back to the piece.
test.beforeEach(({ context }) => isolateClientIp(context));

async function readyPiece(page: Page, label: string): Promise<string> {
  const id = await photographedPiece(page, label);
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/v1/wardrobe/items/${id}`)).json()).status as string,
      { timeout: 30_000 },
    )
    .toBe('ready');
  return id;
}

test('the sparkle styles a draft around her piece, saved back to the piece', async ({ page }) => {
  // A generation and its picture: more than the default budget.
  test.setTimeout(150_000);
  await signIn(page);
  await declineConsent(page);
  const id = await readyPiece(page, 'Camel shacket');
  await page.goto(`/piece/${id}`);

  // The bar: the piece as its chip, both sources on, the placeholder; × and the scrim close it.
  const sparkle = page.getByRole('button', { name: 'Style this piece' });
  await sparkle.click();
  await expect(sparkle).toHaveCount(0);
  await expect(page.getByTestId('piece-chip')).toContainText('Camel shacket');
  await expect(page.getByTestId('source-wardrobe')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('source-shop')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('draft-prompt')).toHaveAttribute('placeholder', 'Style it for…');
  expect(await seriousViolations(page), 'the piece’s bar').toEqual([]);
  // One source always stays on.
  await page.getByTestId('source-shop').click();
  await page.getByTestId('source-wardrobe').click();
  await expect(page.getByTestId('source-shop')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('piece-chip-close').click();
  await expect(page.getByTestId('piece-chip')).toHaveCount(0);
  await sparkle.click();
  await page.getByTestId('prompt-scrim').click({ position: { x: 10, y: 10 } });
  await expect(page.getByTestId('piece-chip')).toHaveCount(0);
  // Closing made nothing.
  expect((await (await page.request.get('/api/v1/looks?status=draft')).json()).items).toEqual([]);

  // Sent empty, the piece is the request: one draft, its anchor the piece.
  await sparkle.click();
  await page.getByTestId('prompt-send').click();
  await expect(page).toHaveURL(new RegExp(`/looks/draft/[0-9a-f-]{36}\\?from=${id}$`), {
    timeout: 30_000,
  });
  await expect(page.getByTestId('draft-look')).toBeVisible();
  const lookId = /\/looks\/draft\/([0-9a-f-]{36})/.exec(page.url())?.[1] ?? '';
  const look = await (await page.request.get(`/api/v1/looks/${lookId}`)).json();
  expect(look.anchor?.id).toBe(id);
  expect(look.pieces.map((p: { piece: { id: string } }) => p.piece.id)).toContain(id);
  // Her line heads the thread: the piece, named.
  await page.getByTestId('prompt-spark').click();
  await page.getByTestId('prompt-expand').click();
  await expect(page.getByTestId('prompt-conversation')).toContainText('Style my camel shacket');
  await page.getByTestId('prompt-minimise').click();

  // ✓ saves it to the Lookbook and she is back on the piece.
  await page.getByTestId('draft-done').click();
  await expect(page.getByText('Saved to your lookbook.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/piece/${id}$`));
  expect((await (await page.request.get(`/api/v1/looks/${lookId}`)).json()).status).toBe('saved');
});

test('her words style the piece too, and × lets the draft go back to the piece', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await signIn(page);
  await declineConsent(page);
  const id = await readyPiece(page, 'Camel shacket');
  await page.goto(`/piece/${id}`);
  await page.getByRole('button', { name: 'Style this piece' }).click();
  await page.getByTestId('draft-prompt').fill('Drinks on Friday');
  await page.getByTestId('draft-prompt').press('Enter');
  await expect(page).toHaveURL(new RegExp(`/looks/draft/[0-9a-f-]{36}\\?from=${id}$`), {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
  await expect(page).toHaveURL(new RegExp(`/piece/${id}$`));
  expect((await (await page.request.get('/api/v1/looks?status=draft')).json()).items).toEqual([]);
});
