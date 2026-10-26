import { wardrobe } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { InboxView } from '../src/features/wardrobe/InboxView';
import { LinkImport } from '../src/features/wardrobe/LinkImport';
import { mockFetch, renderWithApi } from './support/api';
import { JOB_ID } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

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

test('a receipt arrives all ticked; untick what went back and the one pill counts and files', async () => {
  const calls = mockFetch({
    'GET /inbox': { items: [entry], count: 3 },
    [`POST /inbox/${ENTRY_ID}/decide`]: {
      id: ENTRY_ID,
      status: 'filed',
      filedTo: 'wardrobe',
      filedIds: [PIECE, PIECE],
    },
  });
  await renderWithApi(<InboxView />);
  expect(await screen.findByText('Wool coat')).toBeTruthy();
  expect(screen.getByText(`${wardrobe.inbox.from('Zara')} · 24 Sep`)).toBeTruthy();
  expect(screen.getByText(wardrobe.inbox.read(3))).toBeTruthy();
  const scarf = screen.getByRole('checkbox', { name: 'Silk scarf' });
  expect(scarf.props.accessibilityState.checked).toBe(true);
  // One ink pill, and its count follows the ticks.
  expect(screen.getByRole('button', { name: wardrobe.inbox.file(3) })).toBeTruthy();
  await fireEvent.press(scarf);
  expect(
    screen.getByRole('checkbox', { name: 'Silk scarf' }).props.accessibilityState.checked,
  ).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.inbox.file(2) }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      action: 'wardrobe',
      itemIndexes: [0, 2],
    }),
  );
});

test('the wishlist is a hairline pill and Skip a text link; nothing ticked files nothing', async () => {
  const calls = mockFetch({
    'GET /inbox': { items: [entry], count: 3 },
    [`POST /inbox/${ENTRY_ID}/decide`]: {
      id: ENTRY_ID,
      status: 'dismissed',
      filedTo: null,
      filedIds: [],
    },
  });
  await renderWithApi(<InboxView />);
  await screen.findByText('Wool coat');
  for (const label of ['Wool coat', 'Silk scarf', 'Loafers']) {
    await fireEvent.press(screen.getByRole('checkbox', { name: label }));
  }
  const fileNone = screen.getByRole('button', { name: wardrobe.inbox.file(0) });
  expect(fileNone.props.accessibilityState.disabled).toBe(true);
  expect(
    screen.getByRole('button', { name: wardrobe.inbox.toWishlist }).props.accessibilityState
      .disabled,
  ).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.inbox.skip }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({ action: 'dismiss' }),
  );
});

test('an empty Inbox points to forwarding a receipt', async () => {
  mockFetch({ 'GET /inbox': { items: [], count: 0 } });
  await renderWithApi(<InboxView />);
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.add.doors.receipt }));
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe/receipt');
});

test('paste a link reads the page and opens Review on the piece', async () => {
  const calls = mockFetch({
    'POST /imports/link': { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: job('succeeded'),
  });
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
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.add.to.wishlist }));
  expect(screen.getByText(link.help.wishlist)).toBeTruthy();
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
