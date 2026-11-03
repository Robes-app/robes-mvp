import type { DiaryDay, PlanEntry, Today } from '@robes/contracts';
import { diary, today as todayCopy, ui } from '@robes/copy';
import { diaryWindow } from '@robes/core/calendar';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DiaryHome } from '../src/features/home/DiaryHome';
import { dayWordOf, drawerCta, drawerLine, whenWord } from '../src/features/home/diary';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';
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
const ROUTES = {
  'GET /today': todayWith(ENTRIES),
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
  expect(await screen.findByText(todayCopy.greeting('Niall', 8))).toBeTruthy();
  // Today's weather under the greeting, never the selected day's.
  expect(await screen.findByText('Thursday · Dublin · 9–14°C')).toBeTruthy();
  expect(screen.getAllByTestId(/^diary-day-/)).toHaveLength(21);
  const todayCell = screen.getByTestId(`diary-day-${DATE}`);
  expect(todayCell.props.accessibilityState).toEqual({ selected: true });
  expect(todayCell.props.accessibilityLabel).toBe(diary.strip.day(diary.today, 1, false));
  expect(screen.getByTestId(`diary-day-${PAST}`).props.accessibilityLabel).toBe(
    diary.strip.day('Tuesday', 1, true),
  );
  // Planned: a ring on the cell's own ground. Worn: one filled dot. (Hidden from readers: the
  // cell's label says it.)
  const mark = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });
  expect(mark(`diary-mark-${DATE}-0`).props.className).toContain('border-ink-muted bg-selected');
  expect(mark(`diary-mark-${PAST}-0`).props.className).toContain('bg-ink-faint');
  expect(mark(`diary-mark-${TWO}-0`).props.className).toContain('border-ink-muted bg-bg');
  expect(mark(`diary-mark-${TWO}-1`)).toBeTruthy();
  // Today's OOTD leads; the prompt box is there for today.
  expect(screen.getByTestId('ootd-card')).toBeTruthy();
  expect(screen.getByTestId('prompt-box')).toBeTruthy();
});

test('a day with two looks shows the OOTD and the +1 stack, which opens the day', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DiaryHome />);
  await fireEvent.press(await screen.findByTestId(`diary-day-${TWO}`));
  expect(screen.getByTestId(`diary-day-${TWO}`).props.accessibilityState).toEqual({
    selected: true,
  });
  const card = screen.getByTestId('ootd-card');
  expect(card.props.accessibilityLabel).toBe(diary.slot.open('Weekend navy'));
  const stack = screen.getByTestId('ootd-stack');
  expect(stack.props.accessibilityLabel).toBe(diary.slot.moreLabel(1, 'Saturday'));
  await fireEvent.press(stack);
  expect(mockRouter.push).toHaveBeenCalledWith(`/day/${TWO}`);
  await fireEvent.press(card);
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}?day=${TWO}`);
  // The lookbook icon opens the drawer to change the look, the day's look ticked as Scheduled.
  expect(screen.getByRole('button', { name: diary.slot.change })).toBeTruthy();
  // The box follows the day, so the deep link `?day=` lands on it too.
  expect(screen.getByTestId('prompt-box')).toBeTruthy();
});

test('an empty day: Add look → the log sheet → Pick Look → the drawer with the day’s question', async () => {
  mockFetch({
    ...ROUTES,
    'GET /looks': { items: [look()], nextCursor: null },
    'GET /plan': { from: EMPTY, to: EMPTY, days: [{ date: EMPTY, name: null, entries: [] }] },
  });
  await renderWithApi(<DiaryHome day={EMPTY} />);
  const add = await screen.findByTestId('add-look');
  expect(screen.queryByTestId('ootd-card')).toBeNull();
  expect(add.props.accessibilityLabel).toBe(diary.slot.addLabel('Friday'));
  await fireEvent.press(add);
  expect(await screen.findByTestId('log-sheet')).toBeTruthy();
  expect(screen.getByText(diary.log.ahead)).toBeTruthy();
  expect(screen.getByText('Friday 2')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('log-pick'));
  expect(await screen.findByTestId('look-picker')).toBeTruthy();
  expect(await screen.findByTestId('drawer-idle')).toHaveTextContent(diary.drawer.schedule(0));
  expect(screen.getByText(diary.drawer.eyebrow('Friday', 'Fri 2 Oct'))).toBeTruthy();
  expect(await screen.findByText(diary.drawer.wears(2))).toBeTruthy();
  // One tap readies Schedule 1 Look; a pin follows.
  await fireEvent.press(screen.getByTestId(`drawer-look-${LOOK_ID}`));
  expect(screen.getByRole('button', { name: diary.drawer.schedule(1) })).toBeTruthy();
});

test('Capture Look leaves for the photo flow with the day and the camera opening', async () => {
  mockFetch(ROUTES);
  await renderWithApi(<DiaryHome day={EMPTY} />);
  await fireEvent.press(await screen.findByTestId('add-look'));
  await fireEvent.press(await screen.findByTestId('log-capture'));
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
