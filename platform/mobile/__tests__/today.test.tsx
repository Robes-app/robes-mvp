import { today as copy } from '@robes/copy';
import { fireEvent, screen } from '@testing-library/react-native';
import { TodayView } from '../src/features/today/TodayView';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const DATE = '2026-10-01';
const week = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-10-0${i + 1}`,
  looks: i === 0 ? 1 : 0,
}));
const todayWith = (over: object = {}) => ({
  date: DATE,
  hour: 8,
  firstName: 'Niall',
  nextStep: { rule: 'wear' },
  today: [
    {
      worn: false,
      entry: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        date: DATE,
        slot: 'day',
        activity: 'Board meeting',
        look: look(),
      },
    },
  ],
  week,
  tray: [],
  ideas: [],
  inboxCount: 0,
  ...over,
});

test('greets her by her hour and sends the next step’s door to today’s look', async () => {
  mockFetch({ 'GET /today': todayWith() });
  await renderWithApi(<TodayView />);
  expect(await screen.findByText('Good morning, Niall.')).toBeTruthy();
  expect(screen.getByText(copy.next.wear.text)).toBeTruthy();
  await fireEvent.press(screen.getByRole('link', { name: `${copy.next.wear.door} →` }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);
});

test('shows today’s looks and a seven-day strip that opens the plan', async () => {
  mockFetch({ 'GET /today': todayWith() });
  await renderWithApi(<TodayView />);
  expect(await screen.findByRole('link', { name: 'Board meeting' })).toBeTruthy();
  const today = screen.getByRole('link', { name: copy.weekDay('Today', 1) });
  await fireEvent.press(today);
  expect(mockRouter.push).toHaveBeenCalledWith('/plan');
});

test('an empty wardrobe starts with Add pieces', async () => {
  mockFetch({ 'GET /today': todayWith({ nextStep: { rule: 'start' }, today: [] }) });
  await renderWithApi(<TodayView />);
  await fireEvent.press(await screen.findByRole('link', { name: `${copy.next.start.door} →` }));
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe');
});

test('points her at waiting Inbox pieces', async () => {
  mockFetch({ 'GET /today': todayWith({ inboxCount: 2 }) });
  await renderWithApi(<TodayView />);
  await fireEvent.press(await screen.findByRole('link', { name: copy.inbox(2) }));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/wardrobe',
    params: { segment: 'inbox' },
  });
});
