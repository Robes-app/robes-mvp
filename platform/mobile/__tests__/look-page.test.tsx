import { looks } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { LookDetail } from '../src/features/looks/LookDetail';
import { nextDays } from '../src/features/looks/saved-looks';
import { dayLabel } from '../src/features/plan/plan';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const NEW_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv';

beforeEach(() => jest.clearAllMocks());

test('a suggested name can be kept or replaced', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({ nameProvisional: true, name: 'Camel coat, styled' }),
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) =>
      look({ name: JSON.parse(String(init.body)).name, nameProvisional: false }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByText(looks.look.suggested)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: looks.look.keepName }));
  await waitFor(() => expect(screen.queryByText(looks.look.suggested)).toBeNull());
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ name: 'Camel coat, styled' });

  await fireEvent.changeText(screen.getByLabelText(looks.look.nameLabel), 'Gallery opening');
  await fireEvent.press(screen.getByRole('button', { name: looks.look.saveName }));
  expect(await screen.findByText('Gallery opening')).toBeTruthy();
});

test('wear on a day pins the look to the chosen local date', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.look.wearOnDay }));
  const [today, tomorrow] = nextDays(2);
  await fireEvent.press(screen.getByRole('button', { name: dayLabel(tomorrow ?? '', today) }));
  expect(await screen.findByText(looks.look.pinned)).toBeTruthy();
  const pin = (globalThis.fetch as jest.Mock).mock.calls.find(([url]) =>
    String(url).includes('/plan/looks/'),
  );
  expect(JSON.parse(String(pin?.[1]?.body))).toEqual({ dates: [tomorrow], slot: 'day' });
});

test('save as new opens the copy; share opens the share sheet and can be stopped', async () => {
  const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`POST /looks/${LOOK_ID}/variants`]: look({ id: NEW_ID, originLookId: LOOK_ID }),
    'GET /looks': { items: [], nextCursor: null },
    'POST /shares': {
      token: TOKEN,
      url: `https://robes.test/share/${TOKEN}`,
      createdAt: '2026-09-24T10:00:00.000Z',
    },
    [`DELETE /shares/${TOKEN}`]: { ok: true },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.look.saveAsNew }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(`/look/${NEW_ID}`));

  await fireEvent.press(screen.getByRole('button', { name: looks.look.share }));
  await waitFor(() =>
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ url: `https://robes.test/share/${TOKEN}` }),
    ),
  );
  expect(calls.find((c) => c.path.endsWith('/shares'))?.body).toEqual({
    subjectType: 'look',
    subjectId: LOOK_ID,
  });
  await fireEvent.press(await screen.findByRole('button', { name: looks.look.stopSharing }));
  expect(await screen.findByText(looks.look.sharingStopped)).toBeTruthy();
  expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith(TOKEN))).toBe(true);
});
