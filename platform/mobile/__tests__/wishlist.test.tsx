import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { WishlistView } from '../src/features/wardrobe/WishlistView';
import { mockFetch, renderWithApi } from './support/api';
import { piece } from './support/fixtures';

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

test('adding a wish sends its name and clears the field', async () => {
  const calls = mockFetch({
    'GET /wishlist/items': { items: [], nextCursor: null },
    'POST /wishlist/items': wish,
  });
  await renderWithApi(<WishlistView />);
  expect(await screen.findByText(wardrobe.wishlistEmpty.title)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText(wardrobe.wishlist.addLabel),
    'Black leather loafers',
  );
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.wishlist.add }));
  await waitFor(() =>
    expect(screen.getByLabelText(wardrobe.wishlist.addLabel).props.value).toBe(''),
  );
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ label: 'Black leather loafers' });
});

test('"I bought this" promotes the wish into the wardrobe', async () => {
  const calls = mockFetch({
    'GET /wishlist/items': { items: [wish], nextCursor: null },
    [`POST /wishlist/items/${WISH_ID}/promote`]: piece({ label: 'Black leather loafers' }),
  });
  await renderWithApi(<WishlistView />);
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.wishlist.bought }));
  expect(
    await screen.findByText(wardrobe.wishlist.boughtToast('Black leather loafers')),
  ).toBeTruthy();
  expect(calls.some((c) => c.path.endsWith('/promote'))).toBe(true);
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
