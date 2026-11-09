import type { DiaryDay, PlanEntry, Today } from '@robes/contracts';
import { diary, filters, today as todayCopy, ui } from '@robes/copy';
import { diaryWindow } from '@robes/core/calendar';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DiaryHome } from '../src/features/home/DiaryHome';
import { dayWordOf, drawerCta, drawerLine, whenWord } from '../src/features/home/diary';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, modelData } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

// 1 Oct 2026 is a Thursday; the window reaches 21 Sep … 11 Oct.
const DATE = '2026-10-01';
const PAST = '2026-09-29';
const EMPTY = '2026-10-02';
const TWO = '2026-10-03';
const ENTRY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SECOND_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SECOND_LOOK = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const week = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-10-0${i + 1}`,
  looks: 0,
  first: null,
}));

const entry = (over: Partial<PlanEntry> & Pick<PlanEntry, 'id' | 'date'>): PlanEntry => ({
  slot: 'day',
  activity: null,
  worn: false,
  position: 0,
  look: look(),
  ...over,
});
const diaryOf = (entries: Record<string, PlanEntry[]>): Today['diary'] => {
  const w = diaryWindow(DATE);
  return {
    from: w.from,
    to: w.to,
    days: w.days.map(
      (date): DiaryDay => ({
        date,
        name: null,
        place: null,
        weather: null,
        draft: null,
        entries: entries[date] ?? [],
      }),
    ),
  };
};
const todayWith = (entries: Record<string, PlanEntry[]>, over: Partial<Today> = {}): Today => ({
  date: DATE,
  hour: 8,
  firstName: 'Niall',
  today: [],
  week,
  tray: [],
  ideas: [],
  inboxCount: 0,
  overnight: null,
  home: {
    state: { styleConfirmed: true, twinOnFile: true, pics: 6, ownLookSaved: true, snoozed: {} },
    rows: { brands: [], icons: [], styles: [] },
    recent: [],
    candidates: [],
    receipts: null,
    noticed: null,
    saved: [],
    suggested: [],
  },
  diary: diaryOf(entries),
  ...over,
});
const ENTRIES: Record<string, PlanEntry[]> = {
  [DATE]: [entry({ id: ENTRY_ID, date: DATE })],
  [PAST]: [entry({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', date: PAST, worn: true })],
  [TWO]: [
    entry({ id: SECOND_ID, date: TWO }),
    entry({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      date: TWO,
      position: 1,
      look: look({ id: SECOND_LOOK, name: 'Gallery night' }),
    }),
  ],
};
const ROBES_MODELS = [1, 2, 3, 4, 5].map((n) => ({
  id: `w-r${n}`,
  n,
  imageUrl: `https://media.test/catalog/avatar/w-r${n}@v1.png`,
  status: 'ready',
}));
const ON_ROBES = modelData({
  robesModels: ROBES_MODELS,
  stand: { imageUrl: 'https://media.test/catalog/avatar/w-r1@v1.png', generic: true, on: 'robes' },
});
const ROUTES = {
  'GET /today': todayWith(ENTRIES),
  'GET /me/model': ON_ROBES,
  'GET /today/weather': { city: 'Dublin', tempRange: '9–14°C', condition: 'light rain' },
  'GET /me/features': { trips: false },
};

test('the drawer’s words are the web’s (lib/diary.ts)', () => {
  expect(dayWordOf(DATE, DATE)).toBe('today');
  expect(whenWord(EMPTY, DATE)).toBe('on Friday');
  expect(drawerCta({ mode: 'change', date: DATE, today: DATE, picks: 1, changed: false })).toEqual({
    label: diary.drawer.idle('today'),
    ready: false,
  });
  expect(
    drawerCta({ mode: 'change', date: PAST, today: DATE, picks: 1, changed: true }).label,
  ).toBe(diary.drawer.woreOne('Tuesday'));
  expect(drawerCta({ mode: 'add', date: EMPTY, today: DATE, picks: 2, changed: true })).toEqual({
    label: diary.drawer.schedule(2),
    ready: true,
  });
  expect(drawerLine(look(), true, true)).toBe(diary.drawer.scheduled);
  expect(drawerLine(look(), true, false)).toBe(diary.drawer.adding);
  expect(
    drawerLine(look({ timesWorn: 0, createdAt: '2026-09-27T10:00:00.000Z' }), false, false),
  ).toBe(diary.drawer.savedOn('Sun 27 Sep'));
});

test('the strip: 21 cells, today’s page centred, a ring for a plan and a dot for a wear', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DiaryHome />);
  // The greeting stands in the bar (TabScreen's HomeMark); the page opens on today's weather,
  // never the selected day's.
  expect(await screen.findByText('Thursday · Dublin · 9–14°C')).toBeTruthy();
  expect(screen.queryByText(todayCopy.greeting('Niall', 8))).toBeNull();
  expect(screen.getAllByTestId(/^diary-day-/)).toHaveLength(21);
  const todayCell = screen.getByTestId(`diary-day-${DATE}`);
  expect(todayCell.props.accessibilityState).toEqual({ selected: true });
  expect(todayCell.props.accessibilityLabel).toBe(diary.strip.day(diary.today, 1, false));
  expect(screen.getByTestId(`diary-day-${PAST}`).props.accessibilityLabel).toBe(
    diary.strip.day('Tuesday', 1, true),
  );
  // Felix: today, picked, takes the warm fill and edge. Planned: an ink-soft ring on white (the
  // warm fill in the current cell). Worn: one warm-past dot (D11). (Hidden from readers: the
  // cell's label says it.)
  expect(todayCell.props.className).toContain('bg-selected border-selected-line');
  const mark = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });
  expect(mark(`diary-mark-${DATE}-0`).props.className).toContain('border-ink-muted bg-selected');
  expect(mark(`diary-mark-${PAST}-0`).props.className).toContain('bg-warm-past');
  expect(mark(`diary-mark-${TWO}-0`).props.className).toContain(
    'border-ink-muted bg-surface-raised',
  );
  expect(mark(`diary-mark-${TWO}-1`)).toBeTruthy();
  // Today's OOTD leads. Home holds no prompt box (3a, D22).
  expect(screen.getByTestId('ootd-card')).toBeTruthy();
  expect(screen.queryByTestId('prompt-box')).toBeNull();
});

// Design 3k "Wed 4" (Felix D7): every look on the day is its own page, Swap · Edit on each, then
// the page that adds another.
test('a day with two looks shows the OOTD, then the second look, each with Swap and Edit', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DiaryHome />);
  await fireEvent.press(await screen.findByTestId(`diary-day-${TWO}`));
  expect(screen.getByTestId(`diary-day-${TWO}`).props.accessibilityState).toEqual({
    selected: true,
  });
  // Today keeps its fill; the day picked takes only the warm edge (Felix 3a, redline 7 Nov).
  expect(screen.getByTestId(`diary-day-${DATE}`).props.className).toContain(
    'bg-selected border-transparent',
  );
  expect(screen.getByTestId(`diary-day-${TWO}`).props.className).toContain(
    'bg-bg border-selected-line',
  );
  const card = screen.getByTestId('ootd-card');
  expect(card.props.accessibilityLabel).toBe(diary.slot.open('Weekend navy'));
  expect(screen.queryByTestId('ootd-stack')).toBeNull();
  const second = screen.getByTestId('day-card-ffffffff-ffff-4fff-8fff-ffffffffffff');
  await fireEvent.press(second);
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${SECOND_LOOK}?day=${TWO}`);
  await fireEvent.press(card);
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}?day=${TWO}`);
  // Its image stack opens the same detail, on the Add a photo card (PRD §6.1).
  const [stack] = screen.getAllByTestId('saved-look-stack');
  if (!stack) throw new Error('no image stack');
  await fireEvent.press(stack);
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}?day=${TWO}&images=add`);
  // Each look carries Swap and Edit; its name stands under the discs.
  expect(screen.getByRole('button', { name: diary.discs.swapLabel('Weekend navy') })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^Swap / })).toHaveLength(2);
  expect(screen.getAllByText('Weekend navy').length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByTestId('ootd-edit'));
  // Edit opens the draft sheet over the day (D14).
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}?day=${TWO}`);
  await fireEvent.press(screen.getByTestId('ootd-swap'));
  expect(await screen.findByTestId('look-picker')).toBeTruthy();
  // Three pages (two looks, then the way into another): the pager shows.
  expect(screen.getByTestId('day-pager', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('add-page').props.accessibilityLabel).toBe(diary.discs.add);
  // Describe opens the Draft look sheet for the selected day (3a, D22).
  await fireEvent.press(screen.getByTestId('disc-describe'));
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/new?day=${TWO}`);
});

test('an empty day: her model with Capture · Describe · Pick; Pick opens the drawer', async () => {
  mockFetch({
    ...ROUTES,
    'GET /looks': { items: [look()], nextCursor: null },
    'GET /plan': { from: EMPTY, to: EMPTY, days: [{ date: EMPTY, name: null, entries: [] }] },
  });
  await renderWithApi(<DiaryHome day={EMPTY} />);
  expect(await screen.findByTestId('add-page')).toBeTruthy();
  expect(screen.queryByTestId('ootd-card')).toBeNull();
  // One page: no pager.
  expect(screen.queryByTestId('day-pager', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByRole('button', { name: diary.discs.captureLabel('Friday') })).toBeTruthy();
  expect(screen.getByRole('button', { name: diary.discs.describeLabel('Friday') })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: diary.discs.pickLabel('Friday') }));
  expect(await screen.findByTestId('look-picker')).toBeTruthy();
  // The ✓ waits grey until her picks change the day (Front Door PRD rev 3 §4.5).
  const done = await screen.findByRole('button', { name: diary.drawer.done });
  expect(done.props.accessibilityState).toEqual({ disabled: true });
  expect(screen.getByText(diary.drawer.eyebrow('Friday', 'Fri 2 Oct'))).toBeTruthy();
  // The question stands once her looks have loaded (the empty drawer has none to ask over).
  expect(await screen.findByRole('header', { name: diary.log.ahead })).toBeTruthy();
  // The shared filter row and the search sit under the question.
  expect(screen.getByTestId('filter-row')).toBeTruthy();
  expect(screen.getByRole('button', { name: `${filters.all} 1` })).toBeTruthy();
  expect(screen.getByLabelText(diary.drawer.search)).toBeTruthy();
  expect(await screen.findByText(diary.drawer.wears(2))).toBeTruthy();
  // One tap readies Schedule 1 Look on the ✓; a pin follows.
  await fireEvent.press(screen.getByTestId(`drawer-look-${LOOK_ID}`));
  expect(screen.getByRole('button', { name: diary.drawer.schedule(1) })).toBeTruthy();
  // A search that matches nothing offers Clear filters, and the pick survives it.
  await fireEvent.changeText(screen.getByLabelText(diary.drawer.search), 'nothing like this');
  expect(await screen.findByText(filters.noLooks)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: filters.clear }));
  expect(screen.getByRole('button', { name: diary.drawer.schedule(1) })).toBeTruthy();
});

test('Capture leaves for the photo flow with the day and the camera opening', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DiaryHome day={EMPTY} />);
  await fireEvent.press(await screen.findByTestId('disc-capture'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/looks/photo',
    params: { day: EMPTY, start: 'camera' },
  });
});

test('a day gone by: the worn look is the card, no prompt box; × takes the wear back', async () => {
  const calls = mockFetch({
    ...ROUTES,
    [`DELETE /looks/${LOOK_ID}/wears/${PAST}`]: { ok: true },
  });
  await renderWithApi(<DiaryHome day={PAST} />);
  expect(await screen.findByTestId('ootd-card')).toBeTruthy();
  expect(screen.queryByTestId('prompt-box')).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: diary.slot.remove('Weekend navy', 'Tuesday') }),
  );
  expect(await screen.findByText(diary.slot.removed)).toBeTruthy();
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith(`/wears/${PAST}`))).toBe(
      true,
    ),
  );
});

test('× on today’s planned look unpins it, with Undo', async () => {
  // The server read that follows the unpin no longer carries the entry.
  let unpinned = false;
  const calls = mockFetch({
    ...ROUTES,
    'GET /today': () => todayWith(unpinned ? { ...ENTRIES, [DATE]: [] } : ENTRIES),
    [`DELETE /plan/entries/${ENTRY_ID}`]: () => {
      unpinned = true;
      return { ok: true };
    },
  });
  await renderWithApi(<DiaryHome />);
  await fireEvent.press(
    await screen.findByRole('button', { name: diary.slot.remove('Weekend navy', 'today') }),
  );
  // The card leaves at once; the server read follows.
  await waitFor(() => expect(screen.queryByTestId('ootd-card')).toBeNull());
  expect(await screen.findByText(diary.slot.removed)).toBeTruthy();
  expect(screen.getByRole('button', { name: ui.undo })).toBeTruthy();
  await waitFor(() =>
    expect(
      calls.some((c) => c.method === 'DELETE' && c.path.endsWith(`/plan/entries/${ENTRY_ID}`)),
    ).toBe(true),
  );
});

// Felix ModelStack → ModelPicker (D10): on a Robes model the stack opens the picker; a pick applies.
test('the model stack opens Your model; a pick is remembered', async () => {
  const picks: unknown[] = [];
  mockFetch({
    ...ROUTES,
    'PATCH /me/model': (init: RequestInit) => {
      picks.push(JSON.parse(String(init.body)));
      return ON_ROBES;
    },
  });
  await renderWithApi(<DiaryHome day={EMPTY} />);
  await fireEvent.press(await screen.findByRole('button', { name: diary.model.choose }));
  expect(await screen.findByTestId('model-picker')).toBeTruthy();
  expect(screen.getByText(diary.model.title)).toBeTruthy();
  expect(screen.getByRole('button', { name: diary.model.own })).toBeTruthy();
  expect(
    screen.getByRole('radio', { name: diary.dayOne.modelPick(1) }).props.accessibilityState,
  ).toEqual({
    checked: true,
  });
  await fireEvent.press(screen.getByRole('radio', { name: diary.dayOne.modelPick(3) }));
  await waitFor(() => expect(picks).toEqual([{ preset: 3 }]));
});

test('once her twin stands, the model stack is gone', async () => {
  mockFetch({
    ...ROUTES,
    'GET /me/model': modelData({
      robesModels: ROBES_MODELS,
      stand: { imageUrl: 'https://media.test/me/twin.png', generic: false, on: 'twin' },
    }),
  });
  await renderWithApi(<DiaryHome day={EMPTY} />);
  expect(await screen.findByTestId('disc-capture')).toBeTruthy();
  await waitFor(() => expect(screen.queryByTestId('model-stack')).toBeNull());
});

test('a day gone by keeps Capture and Pick, without Describe', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DiaryHome day={PAST} />);
  // The worn look's page, then the way into another.
  expect(await screen.findByTestId('ootd-card')).toBeTruthy();
  expect(screen.getByTestId('disc-capture')).toBeTruthy();
  expect(screen.getByTestId('disc-pick')).toBeTruthy();
  expect(screen.queryByTestId('disc-describe')).toBeNull();
});
