import { looks } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Composer } from '../src/features/looks/Composer';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const SCARF = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

beforeEach(() => jest.clearAllMocks());

test('chosen pieces become a look in the order she picked them, then it opens', async () => {
  const calls = mockFetch({
    'GET /wardrobe/items': {
      items: [
        piece(),
        piece({ id: SCARF, label: 'Silk scarf' }),
        piece({
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          label: 'Still reading',
          status: 'reading',
        }),
      ],
      nextCursor: null,
    },
    'POST /looks': look(),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<Composer />);
  const save = await screen.findByRole('button', { name: looks.composer.create });
  expect(save.props.accessibilityState.disabled).toBe(true);
  expect(screen.queryByRole('checkbox', { name: 'Still reading' })).toBeNull();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Silk scarf' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Camel wool coat' }));
  await fireEvent.changeText(screen.getByLabelText(looks.composer.nameLabel), 'Gallery');
  await fireEvent.press(screen.getByRole('button', { name: looks.composer.create }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    pieces: [{ pieceId: SCARF }, { pieceId: PIECE_ID }],
    name: 'Gallery',
  });
});

test('with no ready pieces it asks for some first', async () => {
  mockFetch({ 'GET /wardrobe/items': { items: [], nextCursor: null } });
  await renderWithApi(<Composer />);
  expect(await screen.findByText(looks.composer.empty)).toBeTruthy();
});
