import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

// Day planning (legacy ff87e89 + 809b13e): summary rows by week, every day opens the day page,
// and the picker adds one or several saved looks at once.
test('a day opens its page, and the picker adds several saved looks to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  for (const name of ['Office', 'Dinner', 'Errands']) {
    await api.post('/api/v1/looks', { data: { name, pieces: [] } });
  }
  const { date } = await (await api.get('/api/v1/today')).json();

  await page.goto('/plan');
  await expect(page.getByRole('radio', { name: 'List' })).toBeChecked();
  await expect(page.getByText('The next 30 days')).toBeVisible();
  await expect(page.getByRole('region', { name: /^(This week|Rest of this week)$/ })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('link', { name: /^Open Today/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${date}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Name the day' })).toBeVisible();
  // An empty day takes a name, so she can plan a week before adding outfits; it shows on the list.
  await page.getByRole('button', { name: 'Name the day' }).click();
  // The title itself becomes the field: focused, an underline and never a box.
  const dayName = page.getByRole('textbox', { name: 'Name the day' });
  await expect(dayName).toBeFocused();
  await expect(dayName).toHaveCSS('outline-style', 'none');
  await expect(dayName).toHaveCSS('border-top-width', '0px');
  await expect(dayName).toHaveCSS('font-style', 'italic');
  await dayName.fill('Gallery opening');
  await dayName.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Gallery opening' })).toBeVisible();
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: /^Open Today.*: Gallery opening$/ })).toBeVisible();
  await page.getByRole('link', { name: /^Open Today/ }).click();
  await page.getByTestId('day-add').click();

  // The drawer (design 3k) asks what she is wearing today and schedules one or several.
  const picker = page.getByRole('dialog', { name: 'What are you wearing?' });
  await expect(picker.getByTestId('drawer-idle')).toHaveText('Schedule Looks');
  await picker.getByRole('button', { name: /Office/ }).click();
  await picker.getByRole('button', { name: /Dinner/ }).click();
  await picker.getByRole('button', { name: 'Schedule 2 Looks' }).click();
  await expect(page.getByText(/^2 looks added to /).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Office/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Dinner/ })).toBeVisible();
  await expect(page.getByText('2 looks', { exact: true })).toBeVisible();
  // The first on the day is the OOTD; ☆ on the other makes it the one that leads home.
  await expect(page.getByTestId('day-ootd')).toContainText('Office');
  await page.getByRole('button', { name: 'Make Dinner the OOTD' }).click();
  await expect(page.getByTestId('day-ootd')).toContainText('Dinner');

  // A look already on the day opens ticked as Scheduled; unticking it takes it off.
  await page.getByTestId('day-add').click();
  await expect(picker.getByText('Scheduled')).toHaveCount(2);
  await expect(picker.getByTestId('drawer-idle')).toHaveText('Schedule Looks');
  await picker.getByRole('button', { name: 'Close' }).click();
  await expect(picker).toBeHidden();

  const month = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  await page.getByRole('link', { name: month, exact: true }).click();
  await expect(page.getByRole('link', { name: /^Open Today .*: Gallery opening$/ })).toBeVisible();

  // Month: a cell per day, each opening its page; the header names the month.
  await page.getByRole('radio', { name: 'Month' }).click();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  await page.getByRole('link', { name: /, 2 looks$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${date}$`));
});

// Focus (28 Oct): the default ring sits in the base layer, so a quiet field's own focus wins (an
// underline that darkens, no box) while a control with nothing of its own still draws the ring.
test('a quiet field focuses as an underline; a bare control keeps the ring', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const { date } = await (await page.request.get('/api/v1/today')).json();
  await page.goto(`/plan/${date}`);
  await page.getByRole('button', { name: 'Name the day' }).click();
  const dayName = page.getByRole('textbox', { name: 'Name the day' });
  await expect(dayName).toBeFocused();
  const field = await dayName.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      focusVisible: el.matches(':focus-visible'),
      boxed: s.outlineStyle !== 'none' && s.outlineWidth !== '0px',
      underline: s.borderBottomWidth,
      shadow: s.boxShadow,
    };
  });
  expect(field.focusVisible).toBe(true);
  expect(field.boxed).toBe(false);
  expect(field.underline).toBe('1px');
  expect(field.shadow).not.toBe('none');
  await dayName.press('Escape');

  // A button with no focus style of its own, reached from the keyboard, takes the default ring.
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Bare';
    b.id = 'bare-focus-probe';
    document.body.append(b);
  });
  await page.keyboard.press('Shift');
  const probe = page.locator('#bare-focus-probe');
  await probe.focus();
  const bare = await probe.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      focusVisible: el.matches(':focus-visible'),
      style: s.outlineStyle,
      width: s.outlineWidth,
    };
  });
  // Felix's 1.5px ring, as this browser draws it: Chrome snaps an outline to whole device pixels,
  // so it reads 1px at 1x and 1.5px at 2x and up.
  const ring = await page.evaluate(() => {
    const ref = document.createElement('div');
    ref.style.outline = '1.5px solid';
    document.body.append(ref);
    const width = getComputedStyle(ref).outlineWidth;
    ref.remove();
    return width;
  });
  expect(bare).toEqual({ focusVisible: true, style: 'solid', width: ring });
  // The shared Button keeps its ring too.
  const named = page.getByRole('button', { name: 'Name the day' });
  await named.focus();
  await expect(named).toHaveCSS('outline-style', 'solid');
  await expect(named).toHaveCSS('outline-width', ring);
});

// Pass 4 (Diary): a worn day reads "· Worn"; List | Month is kept; the diary drawer marks every
// wear of the look and opens a day the look is already on.
test('the diary list says Worn, keeps its view, and the drawer reads every wear', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  const coat = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Camel coat' } })
  ).json();
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Gallery', pieces: [{ pieceId: coat.id }] } })
  ).json();
  const { date } = await (await api.get('/api/v1/today')).json();
  const lastMonth = new Date(`${date.slice(0, 7)}-15T00:00:00Z`);
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
  const earlier = lastMonth.toISOString().slice(0, 10);
  expect(
    (await api.post(`/api/v1/plan/looks/${look.id}/days`, { data: { dates: [date] } })).ok(),
  ).toBe(true);
  for (const wornOn of [earlier, date]) {
    expect((await api.post(`/api/v1/looks/${look.id}/wears`, { data: { wornOn } })).ok()).toBe(
      true,
    );
  }

  await page.goto('/plan');
  await expect(page.getByRole('link', { name: /^Open Today/ })).toContainText(
    '1 look · 1 piece · Worn',
  );

  // Month is kept across a reload, headed Mon to Sun from the one table.
  await page.getByRole('radio', { name: 'Month' }).click();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Month' })).toBeChecked();
  await expect(page.getByText('Wed', { exact: true })).toBeVisible();

  // The drawer: a day last month she wore it (not its last wear) is already recorded…
  const long = (d: string) =>
    new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${d}T00:00:00Z`));
  await page.goto(`/look/${look.id}`);
  await page.getByRole('button', { name: 'Schedule look' }).click();
  const diary = page.getByRole('dialog');
  await diary.getByRole('button', { name: 'Previous month' }).click();
  await diary.getByRole('button', { name: long(earlier) }).click();
  await expect(diary.getByRole('button', { name: 'Already worn that day' })).toBeDisabled();
  // …and today, which the look is on, opens the day.
  await diary.getByRole('button', { name: 'Next month' }).click();
  await diary.getByRole('button', { name: long(date) }).click();
  await diary.getByRole('button', { name: 'Already in the diary · Open the day' }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${date}$`));
  expect(await seriousViolations(page)).toEqual([]);
});
