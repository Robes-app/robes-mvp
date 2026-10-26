import { you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { ForwardReceipts } from '../src/features/you/ForwardReceipts';
import { mockFetch, renderWithApi } from './support/api';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const copy = you.receipts;
const ADDRESS = {
  address: 'abcdefghij0123456789@in.robes.local',
  createdAt: '2026-09-24T10:00:00.000Z',
};

const SPLIT = 'abcdefghij0123456789\n@in.robes.local';

test('shows her forwarding address broken at the @, and the pill copies it', async () => {
  mockFetch({ 'GET /me/inbox-address': ADDRESS });
  await renderWithApi(<ForwardReceipts />);
  expect(await screen.findByText(SPLIT)).toBeTruthy();
  expect(screen.getByTestId('inbox-address').props.accessibilityLabel).toBe(ADDRESS.address);
  await fireEvent.press(screen.getByRole('button', { name: copy.copy }));
  await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(ADDRESS.address));
  expect(await screen.findByRole('button', { name: copy.copied })).toBeTruthy();
});

test('pieces waiting read in the singular or plural, and open the Inbox', async () => {
  mockFetch({
    'GET /me/inbox-address': ADDRESS,
    'GET /inbox': { items: [], count: 1 },
  });
  await renderWithApi(<ForwardReceipts />);
  await fireEvent.press(await screen.findByRole('link', { name: copy.review(1) }));
  expect(screen.getByText(`${copy.waiting(1)} ·`)).toBeTruthy();
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe/inbox');
  expect(copy.review(3)).toBe('Review them →');
});

test('as the add flow’s door it is the card and the steps alone', async () => {
  mockFetch({ 'GET /me/inbox-address': ADDRESS });
  await renderWithApi(<ForwardReceipts door />);
  expect(await screen.findByText(SPLIT)).toBeTruthy();
  expect(screen.getByText(copy.steps[0])).toBeTruthy();
  expect(screen.queryByRole('button', { name: copy.regenerate })).toBeNull();
  expect(screen.queryByRole('button', { name: copy.turnOff })).toBeNull();
});

test('a new address replaces the old one; turning off hides it', async () => {
  const fresh = { ...ADDRESS, address: 'zzzzzzzzzz0123456789@in.robes.local' };
  const calls = mockFetch({
    'GET /me/inbox-address': ADDRESS,
    'POST /me/inbox-address/regenerate': fresh,
    'DELETE /me/inbox-address': { address: null },
  });
  await renderWithApi(<ForwardReceipts />);
  await screen.findByText(SPLIT);
  await fireEvent.press(screen.getByRole('button', { name: copy.regenerate }));
  expect(await screen.findByText('zzzzzzzzzz0123456789\n@in.robes.local')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.turnOff }));
  expect(await screen.findByRole('button', { name: copy.turnOn })).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  expect(screen.queryByTestId('inbox-address')).toBeNull();
});
