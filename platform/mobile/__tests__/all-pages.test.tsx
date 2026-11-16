import { diary } from '@robes/copy';
import { screen } from '@testing-library/react-native';
import { PiecePicker } from '../src/features/looks/PiecePicker';
import { mockFetch, renderWithApi } from './support/api';
import { piece } from './support/fixtures';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const accessory = (n: number) =>
  piece({ id: id(n), label: `Accessory ${n}`, category: 'Accessories', categoryL2: null });

// TestFlight, 16 Nov: a wardrobe of 133 pieces offered 7 of her 17 accessories. A picker reads
// every page of her wardrobe and wishlist, not the first.
test('the piece picker offers every piece she owns, past the first page', async () => {
  const calls = mockFetch({
    'GET /wardrobe/items': (_init: RequestInit, url: string) =>
      new URL(url).searchParams.get('cursor') === 'c2'
        ? { items: [accessory(3)], total: 3, nextCursor: null }
        : { items: [accessory(1), accessory(2)], total: 3, nextCursor: 'c2' },
    'GET /wishlist/items': { items: [], nextCursor: null },
  });
  await renderWithApi(
    <PiecePicker mode={{ add: true }} onRack={[]} onClose={jest.fn()} onPick={jest.fn()} />,
  );
  for (const n of [1, 2, 3]) {
    expect(
      await screen.findByRole('checkbox', { name: diary.flyout.pick(`Accessory ${n}`) }),
    ).toBeTruthy();
  }
  const reads = calls.filter((c) => c.path.endsWith('/wardrobe/items'));
  expect(reads.map((c) => new URL(c.url).searchParams.get('cursor'))).toEqual([null, 'c2']);
});
