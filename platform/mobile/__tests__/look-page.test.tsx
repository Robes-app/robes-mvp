import { lookbook, looks, ui } from '@robes/copy';
import { longDate, lookDateName, monthOf, shiftMonth } from '@robes/core/calendar';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { LookDetail } from '../src/features/looks/LookDetail';
import { localDate, nextDays } from '../src/features/looks/saved-looks';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const _TOKEN = 'AbCdEfGhIjKlMnOpQrStUv';

beforeEach(() => jest.clearAllMocks());

test('a suggested name is renamed with the pencil, never a "Keep this name" line', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({ nameProvisional: true, name: 'Camel coat, styled' }),
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) =>
      look({ name: JSON.parse(String(init.body)).name, nameProvisional: false }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByText('Camel coat, styled')).toBeTruthy();
  // Saved look is said once, over the picture; the suggestion line is gone (27 Oct).
  expect(screen.getAllByText(lookbook.eyebrow.saved)).toHaveLength(1);
  expect(screen.queryByText('Robes’ suggestion')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Keep this name' })).toBeNull();

  // The title itself becomes the field: no label, no Save name, no Cancel.
  await fireEvent.press(screen.getByRole('button', { name: looks.page.rename }));
  const field = screen.getByLabelText(looks.look.nameLabel);
  expect(field.props.value).toBe('Camel coat, styled');
  expect(screen.queryByText('Save name')).toBeNull();
  expect(screen.queryByText('Cancel')).toBeNull();
  await fireEvent.changeText(field, 'Gallery opening');
  await fireEvent(field, 'submitEditing');
  expect(await screen.findByText('Gallery opening')).toBeTruthy();
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ name: 'Gallery opening' });
});

test('an emptied name is refused: the look keeps its name and nothing is sent', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({ name: 'Gallery opening' }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.page.rename }));
  const field = screen.getByLabelText(looks.look.nameLabel);
  await fireEvent.changeText(field, '  ');
  await fireEvent(field, 'blur');
  expect(await screen.findByText('Gallery opening')).toBeTruthy();
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
});

test('the diary on the picture opens the one diary drawer and pins the chosen local date', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': { days: [] },
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.card.diary }));
  const [, tomorrow] = nextDays(2);
  await fireEvent.press(await screen.findByLabelText(longDate(tomorrow ?? '')));
  await fireEvent.press(screen.getByRole('button', { name: lookbook.diary.put }));
  const pin = (globalThis.fetch as jest.Mock).mock.calls.find(([url]) =>
    String(url).includes('/plan/looks/'),
  );
  expect(JSON.parse(String(pin?.[1]?.body))).toEqual({ dates: [tomorrow], slot: 'day' });
});

test('a day already carrying the look opens that day from the drawer (L7)', async () => {
  const [, tomorrow = ''] = nextDays(2);
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': {
      from: tomorrow,
      to: tomorrow,
      days: [
        {
          date: tomorrow,
          name: null,
          entries: [
            {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              date: tomorrow,
              slot: 'day',
              activity: null,
              look: look(),
            },
          ],
        },
      ],
    },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.card.diary }));
  await fireEvent.press(await screen.findByLabelText(longDate(tomorrow)));
  await act(async () => {
    await fireEvent.press(await screen.findByRole('button', { name: lookbook.diary.already }));
  });
  expect(mockRouter.push).toHaveBeenCalledWith(`/day/${tomorrow}`);
});

test('every wear on the look marks its day, not only the last (L9)', async () => {
  const earlier = `${shiftMonth(monthOf(localDate()), -1)}-15`;
  mockFetch({
    // The look's last wear is today; the record also holds a day last month.
    [`GET /looks/${LOOK_ID}`]: look({ lastWornOn: localDate(), timesWorn: 2 }),
    [`GET /looks/${LOOK_ID}/wears`]: {
      items: [
        { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', wornOn: localDate(), pieces: [] },
        { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', wornOn: earlier, pieces: [] },
      ],
    },
    'GET /plan': { days: [] },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.card.diary }));
  await fireEvent.press(await screen.findByLabelText(lookbook.diary.prevMonth));
  await fireEvent.press(await screen.findByLabelText(longDate(earlier)));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: lookbook.diary.recorded })).toBeDisabled(),
  );
});

test('the record logs a day through the same drawer', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': { days: [] },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.page.wears.addDate }));
  // The same drawer, named for the look — never a second way to log a date.
  expect(await screen.findByLabelText(lookbook.diary.prevMonth)).toBeTruthy();
});

test('a look carries no share door, and no save-as-new (27 Oct)', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByText(look().name)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save as new' })).toBeNull();
});

test('the saved look says the day it is pinned for, each piece its wears, each wear its weekday', async () => {
  const [today, tomorrow] = nextDays(2);
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({
      pieces: [{ piece: piece({ wearCount: 4 }), slot: null, role: null }],
      pinnedOn: ['2020-01-01', tomorrow ?? ''],
    }),
    [`GET /looks/${LOOK_ID}/wears`]: {
      items: [{ id: LOOK_ID, wornOn: '2026-09-08', pieces: [{ id: PIECE_ID, label: null }] }],
    },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(
    await screen.findByText(
      `1 piece · 2 wears · last 1 Sep · pinned for ${lookDateName(tomorrow ?? today ?? '')}`,
    ),
  ).toBeTruthy();
  expect(screen.getByText(lookbook.meta.wears(4))).toBeTruthy();
  expect(await screen.findByText('Tue 8 Sep')).toBeTruthy();
  // Delete this look is destructive text, as on the web.
  expect(screen.getByText(looks.page.remove).props.className).toContain('text-danger');
});

test('editing a saved look, a swap lands on one tap behind Undo; Update says Updated', async () => {
  const COAT = '99999999-9999-4999-8999-999999999999';
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`PATCH /looks/${LOOK_ID}`]: look(),
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: COAT, label: 'Navy wool coat' })],
      nextCursor: null,
    },
    'GET /looks': { items: [], nextCursor: null },
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.bar.editLook }));
  // Editing hides the ledger: the rows swap and remove.
  expect(screen.queryByText(lookbook.meta.wears(0))).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  await fireEvent.press(await screen.findByRole('radio', { name: 'Navy wool coat' }));
  // One tap: no "Swap in" step, and nothing written until Update.
  expect(await screen.findByText(lookbook.swap.swapped('Navy wool coat'))).toBeTruthy();
  expect(screen.getByTestId(`rack-row-${COAT}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ui.undo }));
  await waitFor(() => expect(screen.queryByTestId(`rack-row-${COAT}`)).toBeNull());
  expect(screen.getByTestId(`rack-row-${PIECE_ID}`)).toBeTruthy();
  expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);

  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  await fireEvent.press(await screen.findByRole('radio', { name: 'Navy wool coat' }));
  await fireEvent.press(screen.getByRole('button', { name: lookbook.bar.update }));
  expect(await screen.findByText(lookbook.updated)).toBeTruthy();
  expect(JSON.stringify(calls.find((c) => c.method === 'PATCH')?.body)).toContain(COAT);
});
