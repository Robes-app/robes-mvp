import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PieceDetail } from '../src/features/wardrobe/PieceDetail';
import { WardrobeView } from '../src/features/wardrobe/WardrobeView';
import { ME, mockFetch, renderWithApi } from './support/api';
import { PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

test('the grid lists pieces, pages with the cursor and opens a piece', async () => {
  const second = piece({ id: '77777777-7777-4777-8777-777777777777', label: 'Silk scarf' });
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/items': (_: RequestInit, url: string) =>
      url.includes('cursor=next')
        ? { items: [second], nextCursor: null }
        : { items: [piece()], nextCursor: 'next' },
  });
  await renderWithApi(<WardrobeView />);
  expect(await screen.findByText('Camel wool coat')).toBeTruthy();
  await fireEvent(screen.getByTestId('pieces-list'), 'onEndReached');
  expect(await screen.findByText('Silk scarf')).toBeTruthy();
  expect(calls.filter((c) => c.path.endsWith('/wardrobe/items'))).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: 'Camel wool coat' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/piece/${PIECE_ID}`);
});

test('an empty wardrobe invites her to add pieces', async () => {
  mockFetch({ 'GET /me': ME, 'GET /wardrobe/items': { items: [], nextCursor: null } });
  await renderWithApi(<WardrobeView />);
  expect(await screen.findByText(wardrobe.empty.title)).toBeTruthy();
  expect(screen.getByRole('button', { name: wardrobe.choosePhotos })).toBeTruthy();
});

test('a reading piece says so and offers no styling yet', async () => {
  mockFetch({ [`GET /wardrobe/items/${PIECE_ID}`]: piece({ status: 'reading', image: null }) });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  expect(await screen.findByText(wardrobe.reading)).toBeTruthy();
  expect(
    screen.getByRole('button', { name: wardrobe.styleThis }).props.accessibilityState.disabled,
  ).toBe(true);
});

test('editing saves only the edited fields, blanks as null', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ brand: 'Toteme' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.edit }));
  await fireEvent.changeText(screen.getByLabelText(wardrobe.fields.brand), 'Toteme');
  await fireEvent.changeText(screen.getByLabelText(wardrobe.fields.colour), '  ');
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.save }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
    label: 'Camel wool coat',
    brand: 'Toteme',
    color: null,
  });
  expect(await screen.findByText('Toteme')).toBeTruthy();
});

test('removing a piece goes back and offers Undo, which restores it', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`DELETE /wardrobe/items/${PIECE_ID}`]: { ok: true },
    [`POST /wardrobe/items/${PIECE_ID}/restore`]: piece(),
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.remove }));
  expect(mockRouter.back).toHaveBeenCalled();
  expect(await screen.findByText(wardrobe.deleted)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: wardrobe.undo }));
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});
