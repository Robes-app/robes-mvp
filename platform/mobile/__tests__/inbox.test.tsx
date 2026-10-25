import { wardrobe } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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
const job = (status: string) => ({
  id: JOB_ID,
  kind: 'link_import',
  status,
  stage: 'text',
  output: {},
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
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.link.eyebrow }));
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe/link');
});

test('paste a link starts an import and opens the Inbox when it lands', async () => {
  const calls = mockFetch({
    'POST /imports/link': { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: job('succeeded'),
  });
  await renderWithApi(<LinkImport />);
  await fireEvent.changeText(screen.getByLabelText(wardrobe.link.label), 'https://shop.test/coat');
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.link.toWishlist }));
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.link.start }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      url: 'https://shop.test/coat',
      as: 'wishlist',
    }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.link.openInbox }));
  expect(mockRouter.replace).toHaveBeenCalledWith('/wardrobe/inbox');
});
