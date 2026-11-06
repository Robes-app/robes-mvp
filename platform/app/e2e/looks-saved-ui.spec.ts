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

  // Create › New look is the composer now.
  await page.getByRole('button', { name: 'Create' }).first().click();
  await page
    .getByRole('dialog', { name: 'Create' })
    .getByRole('link', { name: 'New look' })
    .click();
  await expect(page).toHaveURL(/\/looks\/new$/);
  // The first piece makes it a draft; the second joins its rack in the same composer; Save keeps it.
  await page.getByRole('button', { name: '+ Add a piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Camel coat' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Draft look')).toBeVisible();
  await page.getByRole('button', { name: '+ Add a piece' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Straight jeans' }).click();
  await expect(page.getByText('The look · 2 pieces', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Put in the diary', { exact: true })).toBeVisible();
  // Beta's save toast names the look.
  await expect(
    page.getByText(/^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]{2} saved to your Lookbook ✓$/),
  ).toBeVisible();
  // Save opens the diary every time; × closes it and writes nothing.
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  // Unnamed, a hand-built look saves as her today ("Wednesday 28 Oct"), the month from the table.
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(
    /^[A-Z][a-z]+day \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,
  );
  const name = (await heading.textContent())?.trim() ?? '';
  // Saved look is said once, over the picture; no "Robes’ suggestion · Keep this name" (27 Oct).
  await expect(page.getByText('Saved look', { exact: true })).toHaveCount(1);
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
  // The saved look says the day it is pinned for, as beta's meta line does ("Thursday 29 Oct").
  const pinnedDay = longTomorrow.split(' ');
  await expect(
    page.getByText(
      new RegExp(`pinned for ${pinnedDay[0]} ${pinnedDay[1]} ${pinnedDay[2]?.slice(0, 3)}$`),
    ),
  ).toBeVisible();

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
  // Delete lives in Editing (D9): destructive text in danger, as on the phone, behind a confirm.
  await expect(page.getByRole('button', { name: 'Delete this look' })).toHaveCount(0);
  await page.getByRole('button', { name: '+ Add pieces' }).click();
  await expect(page.getByRole('button', { name: 'Delete this look' })).toHaveClass(/text-danger/);
  await page.getByRole('button', { name: 'Delete this look' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/looks$/);
  await expect(page.getByText('Look removed.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('link', { name: 'Weekend' })).toBeVisible();
});

test('the image stack (D13): a photograph joins behind Robes’ picture, a tap brings one to the front, Done keeps it', async ({
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
  // Her model wears it first (the offline fake draws it), so the look has Robes' picture.
  await api.patch('/api/v1/me/model', { data: { skin: 6 } });
  await expect
    .poll(async () => (await (await api.get('/api/v1/me/model')).json()).cell.status, {
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
  await manager.locator('input[type="file"][aria-label="Add a photo"]').setInputFiles(PHOTO);
  // The photograph joins behind Robes' picture; it can be removed, Robes' picture cannot.
  await expect(manager.getByRole('button', { name: /^Remove this image/ })).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).images.length)
    .toBe(1);
  // Bring her photograph to the front; Done keeps it as the record.
  await manager.getByRole('button', { name: 'Photograph 1 leads the look' }).click();
  await page.getByTestId('image-manager-done').click();
  await expect(manager).toBeHidden();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).record)
    .toBe('photo');
  await expect(page.getByTestId('saved-look-stack')).toContainText('1');
  // Robes' picture back in front: her photograph stays in the stack.
  await page.getByTestId('saved-look-stack').click();
  await manager.getByRole('button', { name: 'Robes’ picture leads the look' }).click();
  await page.getByTestId('image-manager-done').click();
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).record)
    .toBe('model');
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

  // The caption edits inline; blur keeps it.
  await page.getByTestId('details-caption').click();
  await page.getByRole('textbox', { name: 'Caption' }).fill('Errands, then coffee');
  await page.getByRole('textbox', { name: 'Caption' }).press('Enter');
  await expect(page.getByTestId('details-caption')).toContainText('Errands, then coffee');
  await expect
    .poll(async () => (await (await api.get(`/api/v1/looks/${look.id}`)).json()).note)
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

test('editing a saved look: a swap is one tap behind Undo, and Update says Updated', async ({
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
  // At rest, each row carries the piece's own wears (beta's ledger).
  await expect(page.getByTestId(`rack-row-${camel}`).getByText('0 wears')).toBeVisible();
  await page.getByRole('button', { name: 'Edit look' }).click();
  await page.getByRole('button', { name: /^Swap / }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Navy coat' }).click();
  // One tap: the sheet closes on the swap; Undo puts the rack back.
  await expect(page.getByTestId(`rack-row-${navy}`)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId(`rack-row-${camel}`)).toBeVisible();
  await expect(page.getByTestId(`rack-row-${navy}`)).toHaveCount(0);
  await page.getByRole('button', { name: /^Swap / }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Navy coat' }).click();
  await page.getByRole('button', { name: 'Update look' }).click();
  await expect(page.getByText('Updated', { exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      (await (await page.request.get(`/api/v1/looks/${look.id}`)).json()).pieces.map(
        (p: { piece: { id: string } }) => p.piece.id,
      ),
    )
    .toEqual([navy]);
});

test('a saved look is renamed in place: its title becomes the field', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const res = await page.request.post('/api/v1/looks', { data: { name: 'Office', pieces: [] } });
  const look = await res.json();
  await page.goto(`/look/${look.id}`);
  const heading = page.getByRole('heading', { level: 1, name: 'Office' });
  await expect(heading).toBeVisible();

  // No NAME label, no Save name, no Cancel: the title is the field, focused with the name selected.
  await page.getByRole('button', { name: 'Rename' }).click();
  const field = page.getByRole('textbox', { name: 'Name this look' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('Office');
  await expect(field).toHaveCSS('outline-style', 'none');
  await expect(field).toHaveCSS('border-top-width', '0px');
  await expect(page.getByRole('button', { name: 'Save name' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  expect(await seriousViolations(page)).toEqual([]);
  // Typing replaces the selected name; Enter keeps it.
  await page.keyboard.type('Gallery dinner');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery dinner' })).toBeVisible();
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/looks/${look.id}`)).json()).name)
    .toBe('Gallery dinner');

  // Escape leaves the name as it was; an emptied name is refused (a look is named).
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.keyboard.type('Nope');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery dinner' })).toBeVisible();
  await page.getByRole('button', { name: 'Rename' }).click();
  await field.fill('');
  await field.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery dinner' })).toBeVisible();
  await expect
    .poll(async () => (await (await page.request.get(`/api/v1/looks/${look.id}`)).json()).name)
    .toBe('Gallery dinner');
});
