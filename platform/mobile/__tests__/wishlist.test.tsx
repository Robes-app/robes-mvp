import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { WishDetail } from '../src/features/wardrobe/WishDetail';
import { WishlistView } from '../src/features/wardrobe/WishlistView';
import { mockFetch, renderWithApi } from './support/api';
import { PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const WISH_ID = '99999999-9999-4999-8999-999999999999';
const wish = {
  id: WISH_ID,
  label: 'Black leather loafers',
  category: 'Shoes',
  categoryL2: null,
  categoryL3: null,
  color: null,
  brand: 'Toteme',
  note: null,
  price: null,
  currency: null,
  size: null,
  sourceUrl: null,
  sourceLabel: null,
  image: null,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
};

test('an empty wishlist opens the Add pieces sheet on the wishlist', async () => {
  mockFetch({
    'GET /wishlist/items': { items: [], nextCursor: null },
    'GET /inbox': { items: [], count: 0, counts: { inbox: 0, added: 0, discarded: 0 } },
  });
  await renderWithApi(<WishlistView />);
  expect(await screen.findByText(wardrobe.wishlistEmpty.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.header.savePiece }));
  expect(await screen.findByTestId('add-pieces-sheet')).toBeTruthy();
  // Add without a photo carries the wishlist as the destination.
  await fireEvent.press(screen.getByTestId('add-sheet-manual'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/wardrobe/manual',
    params: { to: 'wishlist' },
  });
});

// The shared piece row (canvas 3b): brand under the name, the price and the rose heart at the
// right; Bought lives on the wish's page (Annie, 9 Nov).
test('a wish’s row: its brand, its price and the heart that lets it go', async () => {
  const calls = mockFetch({
    'GET /wishlist/items': { items: [{ ...wish, price: 390, currency: 'EUR' }], nextCursor: null },
    [`DELETE /wishlist/items/${WISH_ID}`]: { ok: true },
  });
  await renderWithApi(<WishlistView />);
  expect(await screen.findByText('Toteme')).toBeTruthy();
  expect(screen.getByLabelText('€390')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: wardrobe.wishlist.unwish('Black leather loafers') }),
  );
  expect(await screen.findByText(wardrobe.wishlist.removed)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
});

test('removing a wish hides it at once and Undo restores it', async () => {
  const calls = mockFetch({
    'GET /wishlist/items': { items: [wish], nextCursor: null },
    [`DELETE /wishlist/items/${WISH_ID}`]: { ok: true },
    [`POST /wishlist/items/${WISH_ID}/restore`]: wish,
  });
  await renderWithApi(<WishlistView />);
  await fireEvent.press(
    await screen.findByRole('button', { name: wardrobe.wishlist.remove('Black leather loafers') }),
  );
  expect(await screen.findByText(wardrobe.wishlist.removed)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: wardrobe.undo }));
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

test('a wish reads as the rack card: Category · Brand, its price and "Not yours yet"', async () => {
  mockFetch({
    'GET /wishlist/items': {
      items: [
        wish,
        {
          ...wish,
          id: '12121212-1212-4212-8212-121212121212',
          label: 'Silk scarf',
          category: 'Accessories',
          brand: null,
          price: 27.95,
          currency: 'EUR',
        },
      ],
      nextCursor: null,
    },
  });
  await renderWithApi(<WishlistView />);
  expect(await screen.findByText('2 wishlisted')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.header.grid }));
  // The 3-up tile reads the price alone (PRD rev 3 §7.2); "Not yours yet" where there is none.
  expect(await screen.findByText('€27.95')).toBeTruthy();
  expect(screen.getByText('Not yours yet')).toBeTruthy();
  // The filled heart on the photograph lets a wish go.
  expect(
    screen.getByRole('button', { name: wardrobe.wishlist.unwish('Black leather loafers') }),
  ).toBeTruthy();
  // The category chips carry their counts and narrow the grid.
  await fireEvent.press(screen.getByRole('button', { name: 'Shoes 1' }));
  expect(await screen.findByText('1 wishlisted')).toBeTruthy();
  expect(screen.queryByText('Silk scarf')).toBeNull();
});

// A wish's page (canvas 3b, PRD rev 3 §7.3): the piece's anatomy with Brand and Shop, WEARING with
// its rows waiting for their data, Bought and Delete piece at the foot.
test('a wish opens its page: Brand and Shop, a note saves as the wish’s, Bought promotes', async () => {
  const calls = mockFetch({
    [`GET /wishlist/items/${WISH_ID}`]: { ...wish, sourceLabel: 'toteme.com' },
    [`PATCH /wishlist/items/${WISH_ID}`]: { ...wish, note: 'For the wedding' },
    [`POST /wishlist/items/${WISH_ID}/promote`]: piece({ label: wish.label }),
    'GET /wishlist/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<WishDetail id={WISH_ID} />);
  expect(await screen.findByRole('header', { name: wish.label })).toBeTruthy();
  expect(screen.getByRole('button', { name: `${wardrobe.piece.brand}: Toteme` })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.shop}: toteme.com` }),
  ).toBeTruthy();
  expect(screen.getByTestId('delete-piece')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.notes}: ${wardrobe.piece.add}` }),
  );
  await fireEvent.changeText(screen.getByLabelText(wardrobe.piece.rows.notes), 'For the wedding');
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.saveField }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ note: 'For the wedding' });
  await fireEvent.press(screen.getByTestId('wish-bought'));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/piece/[id]',
      params: { id: PIECE_ID },
    }),
  );
});

test('a wish’s WEARING tab: New, and its rows drawn but waiting for their data', async () => {
  mockFetch({ [`GET /wishlist/items/${WISH_ID}`]: wish });
  await renderWithApi(<WishDetail id={WISH_ID} />);
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.wearing }));
  expect(screen.getByText(wardrobe.piece.rows.worn)).toBeTruthy();
  expect(screen.getByText(wardrobe.card.new)).toBeTruthy();
  expect(screen.getByText(wardrobe.piece.rows.inLooks)).toBeTruthy();
  // Seasons and Wear it for are facts here, not doors, until a wish can hold them.
  expect(
    screen.queryByRole('button', { name: new RegExp(`^${wardrobe.piece.rows.season}`) }),
  ).toBeNull();
  expect(
    screen.queryByRole('button', { name: new RegExp(`^${wardrobe.piece.rows.wearFor}`) }),
  ).toBeNull();
});

test('Delete piece on a wish asks first, then lets it go', async () => {
  const calls = mockFetch({
    [`GET /wishlist/items/${WISH_ID}`]: wish,
    [`DELETE /wishlist/items/${WISH_ID}`]: { ok: true },
    'GET /wishlist/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<WishDetail id={WISH_ID} />);
  await fireEvent.press(await screen.findByTestId('delete-piece'));
  expect(await screen.findByText(wardrobe.piece.deleteWishBody)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.cancel }));
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  await fireEvent.press(screen.getByTestId('delete-piece'));
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.piece.deleteConfirm }));
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  expect(mockRouter.back).toHaveBeenCalled();
});
