import type { NotificationItem } from '@robes/contracts';
import { bell, ui } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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

// The server forgets a dismissed item; the list it answers with never carries it again.
function routes() {
  const dismissed = new Set<string>();
  return mockFetch({
    'GET /me/notifications': () => ({ items: ITEMS.filter((i) => !dismissed.has(i.key)) }),
    'POST /me/notifications/dismiss': (init: RequestInit) => {
      dismissed.add((JSON.parse(String(init.body)) as { key: string }).key);
      return { ok: true };
    },
  });
}

test('two items render with where each leads; a tap routes, × dismisses and the card leaves', async () => {
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

test('the sheet (Felix NotificationsSheet): the drawer header, a glyph by kind, and Done only closes', async () => {
  const calls = mockFetch({
    'GET /me/notifications': {
      items: [
        ...ITEMS,
        {
          key: 'overnight:22222222-2222-4222-8222-222222222222',
          kind: 'overnight',
          text: bell.overnight('today'),
          line: null,
          date: '2026-10-01',
          lookId: '22222222-2222-4222-8222-222222222222',
        },
      ],
    },
  });
  await renderWithApi(<Bell />);
  await fireEvent.press(await screen.findByTestId('bell'));
  // The header is the drawer's: × · the tracked title · the ink done disc; no question.
  expect(await screen.findByRole('header', { name: bell.title })).toBeTruthy();
  expect(screen.getByRole('button', { name: ui.close })).toBeTruthy();
  // receipt, the diary's calendar, and the overnight look's `looks`.
  for (const icon of ['receipt', 'calendar', 'looks'])
    expect(screen.getByTestId(`bell-icon-${icon}`)).toBeTruthy();
  // Every alert is a short task with no exclamation mark; the overnight one leads to the Lookbook.
  expect(screen.getByText(bell.overnight('today'))).toBeTruthy();
  expect(screen.getByText(bell.dest.overnight)).toBeTruthy();
  for (const item of ITEMS) expect(item.text).not.toContain('!');

  await fireEvent.press(screen.getByRole('button', { name: ui.done }));
  await waitFor(() => expect(screen.queryByText(bell.receipts(2))).toBeNull());
  // Done marks nothing read: no dismissal is sent and the dot stays.
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
  expect(screen.getByTestId('bell-dot', { includeHiddenElements: true })).toBeTruthy();
  // × closes the same way.
  await fireEvent.press(screen.getByTestId('bell'));
  await fireEvent.press(await screen.findByRole('button', { name: ui.close }));
  await waitFor(() => expect(screen.queryByText(bell.receipts(2))).toBeNull());
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
});

test('with nothing waiting the bell carries no dot and the sheet says so', async () => {
  mockFetch({ 'GET /me/notifications': { items: [] } });
  await renderWithApi(<Bell />);
  const button = await screen.findByTestId('bell');
  expect(button.props.accessibilityLabel).toBe('Notifications');
  await fireEvent.press(button);
  expect(await screen.findByText(bell.empty)).toBeTruthy();
  expect(screen.queryByTestId('bell-dot', { includeHiddenElements: true })).toBeNull();
});
