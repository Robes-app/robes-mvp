import { queryKeys } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { onboarding } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import NameScreen from '../src/app/onboarding/index';
import FirstPiece from '../src/app/onboarding/piece';
import { errorReply, ME, mockFetch, renderWithApi } from './support/api';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const JOB = '22222222-2222-4222-8222-222222222222';

beforeEach(() => jest.clearAllMocks());

test('screen 1 saves the name and moves to the first piece without finishing onboarding', async () => {
  const calls = mockFetch({ 'PATCH /me': { ...ME, onboarded: false } });
  await renderWithApi(<NameScreen />);
  await fireEvent.changeText(screen.getByLabelText(onboarding.firstNameLabel), 'Niall');
  await fireEvent.press(screen.getByRole('button', { name: onboarding.continue }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/piece'));
  expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['PATCH /api/v1/me']);
});

test('screen 2 styles the described piece, completes onboarding and opens the result', async () => {
  const calls = mockFetch({
    'POST /looks/generate': { jobId: JOB, status: 'queued' },
    'POST /me/onboarding/complete': { onboardedAt: new Date().toISOString() },
  });
  await renderWithApi(<FirstPiece />);
  await fireEvent.changeText(screen.getByLabelText(onboarding.pieceLabel), 'white linen shirt');
  await fireEvent.press(screen.getByRole('button', { name: onboarding.pieceStart }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/looks/job/${JOB}`));
  const generate = calls.find((c) => c.path.endsWith('/looks/generate'));
  expect(generate?.body).toEqual({ anchor: { type: 'text', text: 'white linen shirt' } });
  expect(generate?.headers['idempotency-key']).toBeTruthy();
  expect(calls.some((c) => c.path.endsWith('/me/onboarding/complete'))).toBe(true);
});

test('screen 2 can be skipped, and a quota error stays on the screen', async () => {
  mockFetch({
    'POST /looks/generate': errorReply(429, 'quota_exceeded'),
    'POST /me/onboarding/complete': { onboardedAt: new Date().toISOString() },
    'GET /me': ME,
  });
  const { queryClient } = await renderWithApi(<FirstPiece />);
  await fireEvent.changeText(screen.getByLabelText(onboarding.pieceLabel), 'a coat');
  await fireEvent.press(screen.getByRole('button', { name: onboarding.pieceStart }));
  expect(await screen.findByText('You’ve reached today’s limit for this.')).toBeTruthy();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  queryClient.setQueryData(queryKeys.call('me.get'), { ...ME, onboarded: false });
  await fireEvent.press(screen.getByRole('button', { name: onboarding.skip }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  // The tabs gate reads this cache on arrival; it must already say onboarded.
  expect(queryClient.getQueryData<Me>(queryKeys.call('me.get'))?.onboarded).toBe(true);
});
