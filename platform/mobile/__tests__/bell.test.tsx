import type { BellCard, NotificationItem } from '@robes/contracts';
import { bell, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Bell } from '../src/components/Bell';
import { mockFetch, renderWithApi } from './support/api';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const ITEMS: NotificationItem[] = [
  {
    key: 'receipts:2',
    kind: 'receipts',
    text: bell.receipts(2),
    line: 'From Zara',
    date: null,
    lookId: null,
  },
  {
    key: '2026-09-30',
    kind: 'diary',
    text: bell.logWear('Wednesday'),
    line: bell.logWearLine(30),
    date: '2026-09-30',
    lookId: null,
  },
];

const asCards = (items: readonly NotificationItem[], seen = false): BellCard[] =>
  items.map((i) => ({ ...i, seen, section: null }));

// The server forgets a dismissed card and what she has seen; the list it answers never carries
// a dismissed one again.
function routes(cards: BellCard[] = asCards(ITEMS)) {
  const dismissed = new Set<string>();
  let seen = false;
  return mockFetch({
    'GET /me/notifications': () => {
      const left = cards.filter((c) => !dismissed.has(c.key));
      return {
        items: ITEMS.filter((i) => !dismissed.has(i.key)),
        cards: left.map((c) => ({ ...c, seen: seen || c.seen })),
      };
    },
    'POST /me/notifications/dismiss': (init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { key?: string };
      if (body.key) dismissed.add(body.key);
      return { ok: true };
    },
    'POST /me/notifications/seen': () => {
      seen = true;
      return { ok: true };
    },
  });
}

test('two items render with where each leads; a tap routes, the swipe’s Dismiss sends it and the card leaves', async () => {
  const calls = routes();
  await renderWithApi(<Bell />);
  const button = await screen.findByTestId('bell');
  await waitFor(() =>
    expect(screen.getByTestId('bell-dot', { includeHiddenElements: true })).toBeTruthy(),
  );
  // The dot is never colour alone: the count is in the label.
  expect(button.props.accessibilityLabel).toBe('Notifications, 2 new');
  // Felix's 36pt bell keeps a 44pt hit area; the dot is the rose.
  expect(button.props.hitSlop).toBe(4);
  expect(screen.getByTestId('bell-dot', { includeHiddenElements: true }).props.className).toContain(
    'bg-accent-inspire',
  );
  await fireEvent.press(button);
  expect(await screen.findByText(bell.title)).toBeTruthy();
  expect(screen.getByText(bell.receipts(2))).toBeTruthy();
  expect(screen.getByText(bell.logWear('Wednesday'))).toBeTruthy();
  expect(screen.getByText(bell.dest.receipts)).toBeTruthy();
  expect(screen.getByText(bell.dest.diary)).toBeTruthy();

  await fireEvent.press(
    screen.getByRole('link', { name: `${bell.receipts(2)} · ${bell.dest.receipts}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe/inbox');
  await fireEvent.press(screen.getByTestId('bell'));
  await fireEvent.press(
    await screen.findByRole('link', { name: `${bell.logWear('Wednesday')} · ${bell.dest.diary}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/', params: { day: '2026-09-30' } });

  await fireEvent.press(screen.getByTestId('bell'));
  await fireEvent.press(
    await screen.findByRole('button', { name: `${bell.dismiss}: ${bell.receipts(2)}` }),
  );
  // The card leaves before the server agrees (an optimistic write, applied on the next tick).
  await waitFor(() => expect(screen.queryByText(bell.receipts(2))).toBeNull());
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/notifications/dismiss'))?.body).toEqual({
      key: 'receipts:2',
    }),
  );
  await waitFor(() =>
    expect(
      calls.filter((c) => c.method === 'GET' && c.path.endsWith('/me/notifications')).length,
    ).toBeGreaterThan(1),
  );
  expect(screen.queryByText(bell.receipts(2))).toBeNull();
  expect(screen.getByText(bell.logWear('Wednesday'))).toBeTruthy();
});

test('the sheet (Felix NotificationsSheet): the drawer header, a glyph by kind, no ✓; opening sees them all', async () => {
  const overnight: NotificationItem = {
    key: 'overnight:22222222-2222-4222-8222-222222222222',
    kind: 'overnight',
    text: bell.overnight('today'),
    line: null,
    date: '2026-10-01',
    lookId: '22222222-2222-4222-8222-222222222222',
  };
  // The overnight look stood when she last looked; the other two are new.
  const calls = routes([...asCards(ITEMS), ...asCards([overnight], true)]);
  await renderWithApi(<Bell />);
  const button = await screen.findByTestId('bell');
  // The count is the cards she has not seen.
  await waitFor(() => expect(button.props.accessibilityLabel).toBe('Notifications, 2 new'));
  await fireEvent.press(button);
  // The header is the drawer's: × and the tracked title; no Clear all (design 19 Nov).
  expect(await screen.findByRole('header', { name: bell.title })).toBeTruthy();
  expect(screen.getByRole('button', { name: ui.close })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
  // receipt, the diary's calendar, and the overnight look's `looks`.
  for (const icon of ['receipt', 'calendar', 'looks'])
    expect(screen.getByTestId(`bell-icon-${icon}`)).toBeTruthy();
  // Every alert is a short task with no exclamation mark; the overnight one leads to the Lookbook.
  expect(screen.getByText(bell.overnight('today'))).toBeTruthy();
  expect(screen.getByText(bell.dest.overnight)).toBeTruthy();
  for (const item of ITEMS) expect(item.text).not.toContain('!');

  // Opening sees them all: the dot goes; × closes and dismisses nothing.
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/notifications/seen'))).toBe(true));
  await fireEvent.press(screen.getByRole('button', { name: ui.close }));
  await waitFor(() => expect(screen.queryByText(bell.receipts(2))).toBeNull());
  expect(calls.some((c) => c.path.endsWith('/notifications/dismiss'))).toBe(false);
  expect(screen.queryByTestId('bell-dot', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByTestId('bell').props.accessibilityLabel).toBe(bell.title);
});

test('the onboarding cards lead to the twin, the first missing Style DNA answer and Observations', async () => {
  const base = { line: null, date: null, lookId: null, seen: false } as const;
  routes([
    { ...base, key: 'twin:1', kind: 'twin', text: bell.twin, section: null },
    { ...base, key: 'dna:1', kind: 'dna', text: bell.dna(2), section: 'age' },
    {
      ...base,
      key: 'observations:x',
      kind: 'observations',
      text: bell.observations,
      section: null,
    },
  ]);
  await renderWithApi(<Bell />);
  const open = async () => fireEvent.press(await screen.findByTestId('bell'));
  await open();
  for (const icon of ['user', 'dna', 'eye'])
    expect(await screen.findByTestId(`bell-icon-${icon}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('link', { name: `${bell.twin} · ${bell.dest.twin}` }));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/model');
  await open();
  await fireEvent.press(
    await screen.findByRole('link', { name: `${bell.dna(2)} · ${bell.dest.dna}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/you/style', params: { open: 'age' } });
  await open();
  await fireEvent.press(
    await screen.findByRole('link', { name: `${bell.observations} · ${bell.dest.observations}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith('/you/observations');
});

test('the last card dismissed leaves the sheet all caught up', async () => {
  routes(asCards(ITEMS.slice(0, 1)));
  await renderWithApi(<Bell />);
  await fireEvent.press(await screen.findByTestId('bell'));
  const row = await screen.findByTestId('bell-item-receipts:2');
  await act(() => row.props.onAccessibilityAction({ nativeEvent: { actionName: 'remove' } }));
  expect(await screen.findByText(bell.empty)).toBeTruthy();
  expect(screen.queryByText('Nothing new.')).toBeNull();
});

test('with nothing waiting there is no bell (PRD rev 3 §2.2)', async () => {
  mockFetch({ 'GET /me/notifications': { items: [], cards: [] } });
  await renderWithApi(<Bell />);
  await waitFor(() => expect(screen.queryByTestId('bell')).toBeNull());
  expect(screen.queryByTestId('bell-dot', { includeHiddenElements: true })).toBeNull();
});

test('a card swipes to dismiss as a Wardrobe row does: screen readers get Dismiss as its action', async () => {
  const calls = routes();
  await renderWithApi(<Bell />);
  await fireEvent.press(await screen.findByTestId('bell'));
  await screen.findByRole('link', {
    name: `${bell.logWear('Wednesday')} · ${bell.dest.diary}`,
  });
  const row = screen.getByTestId('bell-item-2026-09-30');
  expect(row.props.accessibilityActions).toEqual([
    { name: 'remove', label: `${bell.dismiss}: ${bell.logWear('Wednesday')}` },
  ]);
  // The pan handlers tell the test renderer the row takes no touches at rest, so it will not
  // fire events on it; VoiceOver calls the action itself.
  await act(() => row.props.onAccessibilityAction({ nativeEvent: { actionName: 'remove' } }));
  await waitFor(() => expect(screen.queryByText(bell.logWear('Wednesday'))).toBeNull());
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/notifications/dismiss'))?.body).toEqual({
      key: '2026-09-30',
    }),
  );
});
