import { errors, wardrobe } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PieceStyle } from '../src/features/wardrobe/PieceStyle';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { JOB_ID, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const copy = wardrobe.piece;
const coat = piece({ label: 'Camel shacket', brand: 'Anine Bing', status: 'ready' });

beforeEach(() => jest.clearAllMocks());

// Style a piece → draft look (handoff 24 Nov): the sparkle on her piece opens the bar with the
// piece as its chip; a send starts one draft anchored on it and opens the draft following the job.
test('the sparkle opens the bar with the piece as its chip, both sources on', async () => {
  const calls = mockFetch({});
  await renderWithApi(<PieceStyle piece={coat} hidden={false} />);
  await fireEvent.press(screen.getByRole('button', { name: copy.stylePiece }));
  expect(screen.getByTestId('piece-chip')).toBeTruthy();
  expect(screen.getByText('Camel shacket')).toBeTruthy();
  expect(screen.getByText('Outerwear · Anine Bing')).toBeTruthy();
  expect(screen.getByTestId('source-wardrobe').props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId('source-shop').props.accessibilityState.checked).toBe(true);
  // × on the chip closes the bar, and nothing is made.
  await fireEvent.press(screen.getByTestId('piece-chip-close'));
  expect(screen.queryByTestId('piece-chip')).toBeNull();
  expect(screen.getByRole('button', { name: copy.stylePiece })).toBeTruthy();
  expect(calls).toEqual([]);
});

test('sent empty, the piece is the request: one draft anchored on it, the draft opens', async () => {
  const calls = mockFetch({ 'POST /looks/prompt': { jobId: JOB_ID, status: 'queued' } });
  await renderWithApi(<PieceStyle piece={coat} hidden={false} />);
  await fireEvent.press(screen.getByRole('button', { name: copy.stylePiece }));
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
  expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
    prompt: 'Style my camel shacket',
    draft: true,
    anchorPieceId: PIECE_ID,
    balance: 'mix',
  });
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/looks/draft/[id]',
    params: { id: 'new', job: JOB_ID, from: PIECE_ID },
  });
});

test('a send that fails opens nothing', async () => {
  mockFetch({ 'POST /looks/prompt': () => errorReply(503, 'capacity') });
  await renderWithApi(<PieceStyle piece={coat} hidden={false} />);
  await fireEvent.press(screen.getByRole('button', { name: copy.stylePiece }));
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(await screen.findByText(errors.capacity)).toBeTruthy();
  expect(screen.getByTestId('piece-chip')).toBeTruthy();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('stands down while another sheet of the page is open', async () => {
  mockFetch({});
  await renderWithApi(<PieceStyle piece={coat} hidden />);
  expect(screen.queryByRole('button', { name: copy.stylePiece })).toBeNull();
});
