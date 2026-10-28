import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

// One eyebrow for a piece (the sheet's L1), and the look's photograph in the surface's shape:
// 3:4 in the Lookbook grid (beta), 4:5 on the look page (decision 5, 28 Oct).
test('a jumper reads Knitwear · COS on the rack as in the wardrobe; the grid is 3:4', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const piece = await (
    await page.request.post('/api/v1/wardrobe/items', {
      data: { label: 'COS grey jumper', categoryL2: 'Jumpers & sweaters', brand: 'COS' },
    })
  ).json();
  const look = await (
    await page.request.post('/api/v1/looks', {
      data: { name: 'Grey day', pieces: [{ pieceId: piece.id }] },
    })
  ).json();

  await page.goto(`/look/${look.id}`);
  const row = page.getByTestId(`rack-row-${piece.id}`);
  await expect(row.getByText('Knitwear · COS', { exact: true })).toBeVisible();
  await expect(row.getByText('Grey jumper', { exact: true })).toBeVisible();

  await page.goto('/looks');
  const tile = page
    .getByRole('article')
    .filter({ has: page.getByRole('link', { name: 'Grey day' }) });
  const frame = await tile.locator('div[aria-hidden].rounded-crisp').first().boundingBox();
  expect(frame).not.toBeNull();
  expect((frame?.width ?? 0) / (frame?.height ?? 1)).toBeCloseTo(3 / 4, 2);
});
