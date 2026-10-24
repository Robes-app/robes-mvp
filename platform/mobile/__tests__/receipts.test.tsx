import { you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { ForwardReceipts } from '../src/features/you/ForwardReceipts';
import { mockFetch, renderWithApi } from './support/api';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const copy = you.receipts;
const ADDRESS = {
  address: 'abcdefghij0123456789@in.robes.local',
  createdAt: '2026-09-24T10:00:00.000Z',
};

test('shows her forwarding address and shares it', async () => {
  mockFetch({ 'GET /me/inbox-address': ADDRESS });
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  await renderWithApi(<ForwardReceipts />);
  expect(await screen.findByText(ADDRESS.address)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.share }));
  expect(share).toHaveBeenCalledWith({ message: ADDRESS.address });
});

test('a new address replaces the old one; turning off hides it', async () => {
  const fresh = { ...ADDRESS, address: 'zzzzzzzzzz0123456789@in.robes.local' };
  const calls = mockFetch({
    'GET /me/inbox-address': ADDRESS,
    'POST /me/inbox-address/regenerate': fresh,
    'DELETE /me/inbox-address': { address: null },
  });
  await renderWithApi(<ForwardReceipts />);
  await screen.findByText(ADDRESS.address);
  await fireEvent.press(screen.getByRole('button', { name: copy.regenerate }));
  expect(await screen.findByText(fresh.address)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.turnOff }));
  expect(await screen.findByRole('button', { name: copy.turnOn })).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  expect(screen.queryByText(fresh.address)).toBeNull();
});
