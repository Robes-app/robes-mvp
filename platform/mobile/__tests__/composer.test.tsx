import { lookbook } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Composer } from '../src/features/looks/Composer';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const SCARF = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

beforeEach(() => jest.clearAllMocks());

test('a new look is a draft from its first piece, named when she names it, then it opens', async () => {
  const calls = mockFetch({
    'GET /wardrobe/items': {
      items: [piece(), piece({ id: SCARF, label: 'Silk scarf', category: 'Accessories' })],
      nextCursor: null,
    },
    'POST /looks': look({ status: 'draft' }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<Composer />);
  expect(await screen.findByText(lookbook.guide.body)).toBeTruthy();
  for (const slot of Object.values(lookbook.figure.slots)) {
    expect(screen.getByRole('button', { name: slot })).toBeTruthy();
  }
  await fireEvent.changeText(screen.getByLabelText(lookbook.name.label), 'Gallery');
  await fireEvent.press(screen.getByRole('button', { name: lookbook.rack.addPiece }));
  await fireEvent.press(await screen.findByRole('radio', { name: 'Silk scarf' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    status: 'draft',
    pieces: [{ pieceId: SCARF }],
    name: 'Gallery',
  });
});

test('a sixth draft asks to let the oldest go, and only then makes room', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let posts = 0;
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'POST /looks': () => {
      posts += 1;
      return posts === 1
        ? errorReply(409, 'conflict', { reason: 'drafts_full' })
        : look({ status: 'draft' });
    },
    'GET /looks': { items: [look({ name: 'Oldest draft', status: 'draft' })], nextCursor: null },
  });
  await renderWithApi(<Composer pieceId={PIECE_ID} />);
  await waitFor(() => expect(alert).toHaveBeenCalled());
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: lookbook.rack.addPiece }).props.accessibilityState.busy,
    ).toBe(false),
  );
  const [title, body, buttons] = alert.mock.calls[0] as [
    string,
    string,
    { text: string; onPress?: () => void }[],
  ];
  expect(title).toBe(lookbook.drafts.fullTitle);
  expect(body).toBe(lookbook.drafts.fullBody('Oldest draft'));
  buttons.find((b) => b.text === lookbook.drafts.letGo)?.onPress?.();
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
  const sent = calls.filter((c) => c.method === 'POST').map((c) => c.body);
  expect(sent[0]).toEqual({
    status: 'draft',
    pieces: [{ pieceId: PIECE_ID }],
    anchorPieceId: PIECE_ID,
  });
  expect(sent[1]).toEqual({
    status: 'draft',
    pieces: [{ pieceId: PIECE_ID }],
    anchorPieceId: PIECE_ID,
    letGoOldest: true,
  });
});
