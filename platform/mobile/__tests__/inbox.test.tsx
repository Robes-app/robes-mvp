import { wardrobe } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { InboxView } from '../src/features/wardrobe/InboxView';
import { LinkImport } from '../src/features/wardrobe/LinkImport';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { JOB_ID } from './support/fixtures';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockParams)) delete mockParams[k];
});

const ENTRY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PIECE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const entry = {
  id: ENTRY_ID,
  source: 'receipt',
  retailer: 'Zara',
  subject: 'Your order',
  receivedAt: '2026-09-24T10:00:00.000Z',
  items: [
    {
      index: 0,
      label: 'Wool coat',
      brand: 'Toteme',
      price: 650,
      currency: 'EUR',
      sourceUrl: null,
    },
    { index: 1, label: 'Silk scarf', brand: null, price: null, currency: null, sourceUrl: null },
    { index: 2, label: 'Loafers', brand: null, price: null, currency: null, sourceUrl: null },
  ],
};
const INBOX_ID = '77777777-7777-4777-8777-777777777777';
const job = (status: string) => ({
  id: JOB_ID,
  kind: 'link_import',
  status,
  stage: 'text',
  output: status === 'succeeded' ? { inboxId: INBOX_ID } : {},
  error: null,
  cancelRequested: false,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
  finishedAt: null,
});

const receipts = (items: typeof entry.items, state: 'inbox' | 'added' | 'discarded' = 'inbox') =>
  ({
    items: items.length ? [{ ...entry, items }] : [],
    count: 3,
    counts: { inbox: 3, added: 0, discarded: 0 },
    state,
  }) as const;

// Receipts (Front Door PRD rev 3 §7.5): the tabs with their counts, the forwarding card, the
// pieces by retailer, each with its own × and ✓.
test('the Inbox tab lists the receipt by retailer; ✓ adds one piece, × discards one', async () => {
  const calls = mockFetch({
    'GET /inbox': (_init: RequestInit, url: string) =>
      url.includes('state=added') || url.includes('state=discarded')
        ? receipts([])
        : receipts(entry.items),
    'GET /me/inbox-address': {
      address: 'annie.k7f3@in.robes.test',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    [`POST /inbox/${ENTRY_ID}/decide`]: {
      id: ENTRY_ID,
      status: 'held',
      filedTo: 'wardrobe',
      filedIds: [PIECE],
    },
  });
  await renderWithApi(<InboxView />);
  expect(await screen.findByText(wardrobe.receipts.group('Zara', 3))).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${wardrobe.receipts.tabs.inbox} 3` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${wardrobe.receipts.tabs.added} 0` })).toBeTruthy();
  // The forwarding card reads her address and says what happens next.
  expect(await screen.findByText('annie.k7f3')).toBeTruthy();
  expect(screen.getByText(wardrobe.receipts.extracted)).toBeTruthy();
  // The footer: the sender and the day it came.
  expect(screen.getByText(wardrobe.receipts.received('24 Sep'))).toBeTruthy();
  // ✓ on the coat alone adds that piece; × on the scarf discards it.
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.receipts.add('Wool coat') }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      action: 'wardrobe',
      itemIndexes: [0],
    }),
  );
  expect(await screen.findByText(wardrobe.receipts.added)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: wardrobe.receipts.discard('Silk scarf') }),
  );
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({
      action: 'dismiss',
      itemIndexes: [1],
    }),
  );
  // The group's ✓ takes every piece still waiting.
  await fireEvent.press(screen.getByTestId(`receipt-${ENTRY_ID}-add`));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({ action: 'wardrobe' }),
  );
});

test('ADDED and DISCARDED list what was decided, without the × and ✓', async () => {
  mockFetch({
    'GET /inbox': (_init: RequestInit, url: string) =>
      url.includes('state=added')
        ? {
            items: [{ ...entry, items: [{ ...entry.items[0], state: 'added', filedId: PIECE }] }],
            count: 2,
            counts: { inbox: 2, added: 1, discarded: 0 },
          }
        : url.includes('state=discarded')
          ? { items: [], count: 2, counts: { inbox: 2, added: 1, discarded: 0 } }
          : {
              items: [{ ...entry, items: entry.items.slice(1) }],
              count: 2,
              counts: { inbox: 2, added: 1, discarded: 0 },
            },
    'GET /me/inbox-address': errorReply(404, 'not_found'),
  });
  await renderWithApi(<InboxView />);
  expect(await screen.findByText(wardrobe.receipts.group('Zara', 2))).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: `${wardrobe.receipts.tabs.added} 1` }));
  expect(await screen.findByText(wardrobe.receipts.group('Zara', 1))).toBeTruthy();
  expect(screen.getByText('Wool coat')).toBeTruthy();
  expect(screen.queryByRole('button', { name: wardrobe.receipts.add('Wool coat') })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: `${wardrobe.receipts.tabs.discarded} 0` }));
  expect(await screen.findByText(wardrobe.receipts.discardedEmpty)).toBeTruthy();
});

test('an empty Inbox says nothing past its forwarding card', async () => {
  mockFetch({
    'GET /inbox': { items: [], count: 0, counts: { inbox: 0, added: 0, discarded: 0 } },
    'GET /me/inbox-address': errorReply(404, 'not_found'),
  });
  await renderWithApi(<InboxView />);
  expect(await screen.findByTestId('receipts-tabs')).toBeTruthy();
  // No empty-state card and no second way to forward (Annie, 9 Nov).
  expect(screen.queryByRole('button', { name: wardrobe.add.doors.receipt })).toBeNull();
});

test('paste a link reads the page and opens Review on the piece', async () => {
  const calls = mockFetch({
    'POST /imports/link': { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: job('succeeded'),
  });
  // Where it goes was chosen on the Add pieces sheet; the link screen only says so.
  mockParams.to = 'wishlist';
  await renderWithApi(<LinkImport />);
  const link = wardrobe.add.link;
  // Read the page waits for a link; Paste fills it from the clipboard.
  expect(screen.getByRole('button', { name: link.read }).props.accessibilityState.disabled).toBe(
    true,
  );
  await Clipboard.setStringAsync('https://shop.test/coat');
  await fireEvent.press(screen.getByRole('button', { name: link.paste }));
  await waitFor(() =>
    expect(screen.getByLabelText(link.label).props.value).toBe('https://shop.test/coat'),
  );
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.getByText(new RegExp(link.filingTo.wishlist))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: link.read }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      url: 'https://shop.test/coat',
      as: 'wishlist',
    }),
  );
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/wardrobe/review',
      params: { to: 'wishlist', link: INBOX_ID },
    }),
  );
});
