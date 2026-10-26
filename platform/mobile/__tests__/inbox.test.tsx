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
  source: 'link',
  retailer: 'Fixture Shop',
  subject: 'Coat',
  receivedAt: '2026-09-24T10:00:00.000Z',
  items: [
    {
      index: 0,
      label: 'Wool coat',
      brand: 'Toteme',
      price: 650,
      currency: 'EUR',
      sourceUrl: 'https://shop.test/coat',
    },
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

test('files a held link into the wardrobe', async () => {
  const calls = mockFetch({
    'GET /inbox': { items: [entry], count: 1 },
    [`POST /inbox/${ENTRY_ID}/decide`]: {
      id: ENTRY_ID,
      status: 'filed',
      filedTo: 'wardrobe',
      filedIds: [PIECE],
    },
  });
  await renderWithApi(<InboxView />);
  expect(await screen.findByText('Wool coat')).toBeTruthy();
  expect(screen.getByText(wardrobe.inbox.from('Fixture Shop'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.inbox.toWardrobe }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      action: 'wardrobe',
      itemIndexes: [0],
    }),
  );
});

test('an empty Inbox offers Paste a link', async () => {
  mockFetch({ 'GET /inbox': { items: [], count: 0 } });
  await renderWithApi(<InboxView />);
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.add.doors.link }));
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe/link');
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
