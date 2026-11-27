import type { Look } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ProposalDetail } from '../src/features/looks/ProposalDetail';
import { nativeAnalytics } from '../src/lib/analytics';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const KEY = 'p-aaaa1111';
const WISH = '88888888-8888-4888-8888-888888888888';
const skirt = {
  key: KEY,
  name: 'Merlot Sequin Midi Skirt',
  category: 'Bottoms' as const,
  color: '',
  brand: 'Freemans',
  retailerHint: '',
  pricePoint: '£43',
  role: null,
  wishlisted: false,
  wishlistItemId: null,
  capture: null,
  url: 'https://www.freemans.com/skirt',
};
const suggestion = (o: Partial<Look> = {}): Look =>
  look({ status: 'suggested', source: 'seed', proposals: [skirt], ...o });

// A piece Robes picked, before it is on her wishlist (Annie, 24 Nov): its page reads from the
// look, and Add to wishlist files it as Save would, then opens it as her wish.
test('a piece to find shows its facts and shop link; Add to wishlist files it and opens the wish', async () => {
  let filed = false;
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: () =>
      filed
        ? suggestion({ proposals: [{ ...skirt, wishlisted: true, wishlistItemId: WISH }] })
        : suggestion(),
    [`POST /looks/${LOOK_ID}/proposals/${KEY}/wish`]: () => {
      filed = true;
      return suggestion({ proposals: [{ ...skirt, wishlisted: true, wishlistItemId: WISH }] });
    },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<ProposalDetail lookId={LOOK_ID} pieceKey={KEY} />);
  expect(await screen.findByText('Merlot Sequin Midi Skirt')).toBeTruthy();
  expect(screen.getByText('Freemans')).toBeTruthy();
  expect(screen.getByText('£43')).toBeTruthy();
  // The Shop row names the shop by its link when Robes named none; opening it is tracked by
  // where it was opened, never the link.
  expect(screen.getByText('freemans.com')).toBeTruthy();
  const track = jest.spyOn(nativeAnalytics, 'track');
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await fireEvent.press(screen.getByRole('link', { name: wardrobe.piece.openShop }));
  expect(open).toHaveBeenCalledWith('https://www.freemans.com/skirt');
  expect(track).toHaveBeenCalledWith('shop_opened', { from: 'piece_to_find' });
  // Nothing is stored by looking.
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
  await fireEvent.press(screen.getByTestId('proposal-wish'));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/wish/[id]',
      params: { id: WISH },
    }),
  );
  expect(calls.filter((c) => c.path.endsWith('/wish'))).toHaveLength(1);
  expect(screen.getByTestId('proposal-wish')).toBeTruthy();
  expect(lookbook.pieceToFind.add).toBe('Add to wishlist');
});

test('a piece the look no longer holds says so', async () => {
  mockFetch({ [`GET /looks/${LOOK_ID}`]: suggestion({ proposals: [] }) });
  await renderWithApi(<ProposalDetail lookId={LOOK_ID} pieceKey={KEY} />);
  expect(await screen.findByText(lookbook.pieceToFind.gone)).toBeTruthy();
});
