import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(({ context }) => isolateClientIp(context));

async function makePieces(page: Page, labels: string[]): Promise<void> {
  for (const label of labels) {
    const res = await page.request.post('/api/v1/wardrobe/items', { data: { label } });
    expect(res.status()).toBe(201);
  }
}

test('compose a look, wear it today with undo, plan it, then unpin and undo', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await makePieces(page, ['Camel coat', 'Straight jeans']);
  // The pieces were filed behind the page's back, after sign-in had already counted an empty
  // wardrobe (cached 30s): load afresh so the draft offers Pick from your wardrobe.
  await page.reload();

  // Create › New look is the composer now.
  await page.getByRole('button', { name: 'Create' }).first().click();
  await page
    .getByRole('dialog', { name: 'Create' })
    .getByRole('link', { name: 'New look' })
    .click();
  // The draft drawer (D14) opens over the screen; the first pieces make the draft, the done disc
  // saves it, and the saved look opens with the diary up.
  await expect(page).toHaveURL(/\/looks\/draft\/new$/);
  await page.getByRole('button', { name: 'Pick from your wardrobe' }).click();
  const picker = page.getByTestId('piece-picker');
  await picker.getByRole('button', { name: 'Include Camel coat' }).click();
  await picker.getByRole('button', { name: 'Add 1 piece' }).click();
  await expect(page).toHaveURL(/\/looks\/draft\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Draft look')).toBeVisible();
  await page.getByRole('button', { name: 'Pick from your wardrobe' }).click();
  await picker.getByRole('button', { name: 'Include Straight jeans' }).click();
  await picker.getByRole('button', { name: 'Add 1 piece' }).click();
  await expect(page.getByRole('list', { name: 'The rack · 2 pieces' })).toBeVisible();
  await page.getByTestId('draft-done').click();
  await expect(page.getByText('Put in the diary', { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  // Beta's save toast names the look.
  await expect(
    page.getByText(/^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]{2} saved to your Lookbook ✓$/),
  ).toBeVisible();
  // Save opens the diary every time; × closes it and writes nothing.
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

  // The saved look opened with the diary up and dropped the parameter from its address.
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId('draft-look')).toHaveCount(0);
  // Unnamed, a hand-built look saves as her today ("Wednesday 28 Oct"), the month from the table.
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(
    /^[A-Z][a-z]+day \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,
  );
  const name = (await heading.textContent())?.trim() ?? '';
  // Felix 3e keeps the photo bare: no eyebrow, no "Robes’ suggestion · Keep this name" (27 Oct);
  // the back disc on the photo says where she is.
  await expect(page.getByTestId('saved-look-back')).toBeVisible();
  await expect(page.getByText('Saved look', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Robes’ suggestion')).toHaveCount(0);
  expect(await seriousViolations(page)).toEqual([]);

  // The look's own record lives behind Details › Worn (Felix 3e), empty until the first day she
  // wears it; the row reads "Not worn yet".
  await page.getByRole('tab', { name: 'Details' }).click();
  await expect(page.getByTestId('details-worn')).toContainText('Not worn yet');

  // No wear buttons on the page (27 Oct): Schedule look, the one ink button, opens the diary.
  await expect(page.getByRole('button', { name: 'Wear it today' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save as new' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Schedule look' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'I wore this today' }).click();
  // Beta says so: today's wear is "Worn today ✓", never silence (L10).
  await expect(page.getByRole('listitem').getByText('Worn today ✓')).toBeVisible();
  // The day it was worn joins the record, and opens that day.
  // Her local date, printed the way core's longDate prints it: "Saturday 24 October".
  const todayLocal = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const longToday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${todayLocal}T00:00:00Z`));
  // The Worn subview lists the day, with its weekday ("Tue 8 Sep"), the month from the table.
  await page.getByTestId('details-worn').click();
  const record = page.getByTestId('worn-view');
  await expect(record.getByRole('link', { name: `Open ${longToday}` })).toBeVisible();
  await expect(
    record.getByText(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,
    ),
  ).toBeVisible();
  // The wear put the look on its day (beta): it leads the day as the OOTD, and the day keeps its
  // own title.
  await record.getByRole('link', { name: `Open ${longToday}` }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${todayLocal}`));
  await expect(page.getByTestId('day-ootd')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Name the day' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add a look/ })).toBeVisible();
  await page.goBack();
  // Taken off the record from its own row, in the Worn subview.
  await page.getByRole('tab', { name: 'Details' }).click();
  await page.getByTestId('details-worn').click();
  await record.getByRole('button', { name: `Not worn on ${longToday}` }).click();
  await expect(record.getByRole('link', { name: `Open ${longToday}` })).toBeHidden();
  await record.getByRole('button', { name: 'Back' }).click();
  const lookId = page.url().split('/').at(-1) ?? '';
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/looks/${lookId}`)).json()).timesWorn)
    .toBe(0);

  const tomorrow = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  // Schedule look is the one way a look reaches a day.
  const longTomorrow = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${tomorrow}T00:00:00Z`));
  await page.getByRole('button', { name: 'Schedule look' }).click();
  const diary = page.getByRole('dialog');
  await diary.getByRole('button', { name: longTomorrow }).click();
  await diary.getByRole('button', { name: 'Put it in the diary' }).click();
  await expect(page.getByRole('listitem').getByText(/is in your diary for/)).toBeVisible();
  // The facts line that named the pinned day is gone (D16); the look is pinned for tomorrow.
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/looks/${lookId}`)).json()).pinnedOn)
    .toContain(tomorrow);

  // The plan lists summary rows; the row opens the day page, where the day is named and edited.
  await page.goto('/plan');
  await page.getByRole('link', { name: new RegExp(`${name}$`) }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${tomorrow}$`));
  expect(await seriousViolations(page)).toEqual([]);
  // The day keeps its own title (beta): unnamed, it invites a name rather than borrowing the look's.
  await page.getByRole('button', { name: 'Name the day', exact: true }).click();
  await page.getByLabel('Name the day').fill('Gallery opening');
  await page.getByLabel('Name the day').press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery opening' })).toBeVisible();
  await expect
    .poll(async () => {
      const plan = await (await page.request.get(`/api/v1/plan?from=${tomorrow}&days=1`)).json();
      return plan.days[0].entries[0]?.activity;
    })
    .toBe('Gallery opening');

  await page.getByRole('button', { name: `Take ${name} off the day` }).click();
  await expect(page.getByRole('link', { name })).toBeHidden();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('link', { name })).toBeVisible();

  await page.goto('/looks');
  await expect(page.getByRole('link', { name })).toBeVisible();
});

test('removing a look can be undone', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Weekend', pieces: [] } })
  ).json();
  await page.goto(`/look/${look.id}`);
  // Delete (D9) is an ink-soft link at the foot of Details (3e edits in place, D17), behind a
  // confirm whose Delete is the danger fill; Cancel leaves the look (redline 7 Nov).
  await expect(page.getByRole('button', { name: 'Delete this look' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Details' }).click();
  await expect(page.getByRole('button', { name: 'Delete this look' })).toHaveClass(
    /text-ink-muted/,
  );
  await page.getByRole('button', { name: 'Delete this look' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete this look' }).click();
  const confirm = page.getByRole('alertdialog').getByRole('button', { name: 'Delete' });
  await expect(confirm).toHaveClass(/bg-danger/);
  await confirm.click();
  await expect(page).toHaveURL(/\/looks$/);
  await expect(page.getByText('Look removed.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('link', { name: 'Weekend' })).toBeVisible();
});

test('the image stack (D19, D20): a photograph lands in focus, waits for Update look, and the card in front leads', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  const coat = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Camel coat' } })
  ).json();
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Gallery', pieces: [{ pieceId: coat.id }] } })
  ).json();
  // Her twin wears it first (her facts draw it; the offline fake draws the picture), so the look
  // has Robes' picture. A skin pick on a Robes model is refused (plan 2026-11-05 Q9).
  await api.patch('/api/v1/me/dna', { data: { facts: { heightCm: 168 } } });
  await api.post('/api/v1/me/model/twin');
  await expect
    .poll(async () => (await (await api.get('/api/v1/me/model')).json()).twin.status, {
      timeout: 30_000,
    })
    .toBe('ready');
  await api.post(`/api/v1/looks/${look.id}/render`);
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).onModel, {
      timeout: 30_000,
    })
    .toBe('ready');

  await page.goto(`/look/${look.id}`);
  // No photograph yet: the stack badge reads +, and no You · Model anywhere.
  await expect(page.getByRole('radiogroup', { name: 'The record of this look' })).toHaveCount(0);
  await page.getByTestId('saved-look-stack').click();
  const manager = page.getByTestId('image-manager');
  await expect(manager).toBeVisible();
  // One card: the last one left has no ×.
  await expect(manager.getByRole('button', { name: /^Remove this image/ })).toHaveCount(0);
  await manager.locator('input[type="file"][aria-label="Add a photo"]').setInputFiles(PHOTO);
  // The photograph lands in the frame at once, and now each card has its × — Robes' picture too.
  await expect(manager.getByTestId('image-card-added')).toBeInViewport({ timeout: 30_000 });
  // ✓ straight away, while the strip may still be gliding to the new card: it still leads.
  await expect(manager.getByRole('button', { name: /^Remove this image/ })).toHaveCount(2);
  // Nothing is written until Update look (D20).
  expect((await (await api.get(`/api/v1/looks/${look.id}`)).json()).images).toEqual([]);
  // ✓ leaves the card in view in front; the photo shows it, and Update look keeps it.
  await page.getByTestId('image-manager-done').click();
  await expect(manager).toBeHidden();
  await page.getByTestId('update-look').click();
  await expect
    .poll(async () => {
      const now = await (await api.get(`/api/v1/looks/${look.id}`)).json();
      return [now.images.length, now.record];
    })
    .toEqual([1, 'photo']);
  await expect(page.getByTestId('saved-look-stack')).toContainText('1');
  // Hiding Robes' picture leaves her photograph as the only card: it keeps no ×.
  await page.getByTestId('saved-look-stack').click();
  await manager.getByRole('button', { name: 'Remove this image · Robes’ picture' }).click();
  await expect(manager.getByRole('button', { name: /^Remove this image/ })).toHaveCount(0);
  await page.getByTestId('image-manager-done').click();
  await page.getByTestId('update-look').click();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).robesHidden)
    .toBe(true);
  expect(await seriousViolations(page)).toEqual([]);
});

test('Details: the caption keeps on blur, Seasons picks the four seasons, Tags picks and adds', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Errands', pieces: [] } })
  ).json();
  await page.goto(`/look/${look.id}`);
  await page.getByRole('tab', { name: 'Details' }).click();
  await expect(page.getByTestId('details-seasons')).toContainText('Year round');
  await expect(page.getByTestId('details-tags')).toContainText('None');

  // The caption is the look's name (D16); it edits inline, and Enter keeps it.
  await page.getByTestId('details-caption').click();
  await page.getByRole('textbox', { name: 'Caption' }).fill('Errands, then coffee');
  await page.getByRole('textbox', { name: 'Caption' }).press('Enter');
  await expect(page.getByTestId('details-caption')).toContainText('Errands, then coffee');
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).name)
    .toBe('Errands, then coffee');

  // Seasons: any of the four; the band every older reader sees follows (D12).
  await page.getByTestId('details-seasons').click();
  const seasons = page.getByTestId('seasons-view');
  await seasons.getByRole('button', { name: 'Autumn' }).click();
  await expect(seasons.getByRole('button', { name: 'Autumn' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).climateBand)
    .toBe('autumn_winter');
  await seasons.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByTestId('details-seasons')).toContainText('Autumn');

  // Tags: a typed tag joins her namespace and the look.
  await page.getByTestId('details-tags').click();
  const tags = page.getByTestId('tags-view');
  await tags.getByRole('textbox', { name: 'Add a tag' }).fill('Weekend casual');
  await tags.getByRole('button', { name: 'Keep the tag' }).click();
  await expect(tags.getByRole('button', { name: 'Tag it Weekend casual' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).tags)
    .toEqual(['Weekend casual']);
  await tags.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByTestId('details-tags')).toContainText('Weekend casual');
  expect(await seriousViolations(page)).toEqual([]);
});

test('a saved look edits in place (3e): a swap behind Undo, Discard asks, Update look applies', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await makePieces(page, ['Camel coat', 'Navy coat']);
  const items = (await (await page.request.get('/api/v1/wardrobe/items')).json()).items as {
    id: string;
    label: string;
  }[];
  const camel = items.find((p) => p.label === 'Camel coat')?.id ?? '';
  const navy = items.find((p) => p.label === 'Navy coat')?.id ?? '';
  const look = await (
    await page.request.post('/api/v1/looks', {
      data: { name: 'Weekend', pieces: [{ pieceId: camel }] },
    })
  ).json();
  await page.goto(`/look/${look.id}`);
  // 3e edits in place (D17): no Edit chip, the rows carry their swap and × discs, and nothing
  // waits to be applied yet.
  const look3e = page.getByTestId('saved-look');
  await expect(page.getByRole('button', { name: 'Edit look' })).toHaveCount(0);
  await expect(look3e.getByTestId('update-look')).toHaveCount(0);
  const picker = page.getByTestId('piece-picker');
  // At rest the rows open their pieces; the pencil shows the swap and × (plan R2).
  await expect(look3e.getByRole('button', { name: /^Swap / })).toHaveCount(0);
  await look3e.getByRole('button', { name: 'Edit pieces' }).click();
  await look3e.getByRole('button', { name: /^Swap / }).click();
  await picker.getByRole('button', { name: 'Include Navy coat' }).click();
  await picker.getByRole('button', { name: 'Swap it in' }).click();
  // The swap lands on the page; Undo puts the rack back.
  await expect(look3e.getByTestId(`rack-row-${navy}`)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(look3e.getByTestId(`rack-row-${camel}`)).toBeVisible();
  await expect(look3e.getByTestId(`rack-row-${navy}`)).toHaveCount(0);
  await look3e.getByRole('button', { name: /^Swap / }).click();
  await picker.getByRole('button', { name: 'Include Navy coat' }).click();
  await picker.getByRole('button', { name: 'Swap it in' }).click();
  // Leaving with the change unapplied asks first; Keep editing stays.
  await page.getByTestId('saved-look-back').click();
  const ask = page.getByRole('alertdialog', { name: 'Discard your changes?' });
  await ask.getByRole('button', { name: 'Keep editing' }).click();
  await expect(look3e.getByTestId(`rack-row-${navy}`)).toBeVisible();
  // Update look holds the foot in Schedule look's place while the change waits (PRD §6.1); it
  // applies the change, she stays on the look, and Schedule look comes back.
  await expect(look3e.getByRole('button', { name: 'Schedule look' })).toHaveCount(0);
  await look3e.getByTestId('update-look').click();
  await expect(page.getByText('Updated', { exact: true })).toBeVisible();
  await expect(look3e.getByRole('button', { name: 'Schedule look' })).toBeVisible();
  await expect
    .poll(async () =>
      (await (await page.request.get(`/api/v1/looks/${look.id}`)).json()).pieces.map(
        (p: { piece: { id: string } }) => p.piece.id,
      ),
    )
    .toEqual([navy]);
});

test('a saved look is renamed in Details › Caption: the name is the caption (D16)', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  const res = await page.request.post('/api/v1/looks', { data: { name: 'Office', pieces: [] } });
  const look = await res.json();
  await page.goto(`/look/${look.id}`);
  // Nothing between the photo and the tabs: no title, no pencil, no facts line.
  await expect(page.getByRole('heading', { level: 1, name: 'Office' })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Rename' })).toHaveCount(0);
  await expect(page.getByText(/pinned for/)).toHaveCount(0);
  await page.getByRole('tab', { name: 'Details' }).click();
  await expect(page.getByTestId('details-caption')).toContainText('Office');
  await page.getByTestId('details-caption').click();
  const field = page.getByRole('textbox', { name: 'Caption' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('Office');
  expect(await seriousViolations(page)).toEqual([]);
  await field.fill('Gallery dinner');
  await field.press('Enter');
  await expect(page.getByTestId('details-caption')).toContainText('Gallery dinner');
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/looks/${look.id}`)).json()).name)
    .toBe('Gallery dinner');
  // An emptied caption keeps the name it had: a look is named.
  await page.getByTestId('details-caption').click();
  await field.fill('');
  await field.press('Enter');
  await expect(page.getByTestId('details-caption')).toContainText('Gallery dinner');
});
