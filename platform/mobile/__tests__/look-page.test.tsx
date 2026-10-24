import { lookbook, looks } from '@robes/copy';
import { longDate } from '@robes/core/calendar';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { LookDetail } from '../src/features/looks/LookDetail';
import { nextDays } from '../src/features/looks/saved-looks';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const NEW_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const _TOKEN = 'AbCdEfGhIjKlMnOpQrStUv';

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

  await fireEvent.press(screen.getByRole('button', { name: looks.page.rename }));
  await fireEvent.changeText(screen.getByLabelText(looks.look.nameLabel), 'Gallery opening');
  await fireEvent.press(screen.getByRole('button', { name: looks.look.saveName }));
  expect(await screen.findByText('Gallery opening')).toBeTruthy();
});

test('wear on a day opens the one diary drawer and pins the chosen local date', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': { days: [] },
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.look.wearOnDay }));
  const [, tomorrow] = nextDays(2);
  await fireEvent.press(await screen.findByLabelText(longDate(tomorrow ?? '')));
  await fireEvent.press(screen.getByRole('button', { name: lookbook.diary.put }));
  const pin = (globalThis.fetch as jest.Mock).mock.calls.find(([url]) =>
    String(url).includes('/plan/looks/'),
  );
  expect(JSON.parse(String(pin?.[1]?.body))).toEqual({ dates: [tomorrow], slot: 'day' });
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

test('save as new opens the copy', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`POST /looks/${LOOK_ID}/variants`]: look({ id: NEW_ID, originLookId: LOOK_ID }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.look.saveAsNew }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(`/look/${NEW_ID}`));
  // A look carries no share door.
  expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
});
