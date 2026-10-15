import { keyPiece, looks, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { IdeaScreen, JobIdeaScreen } from '../src/features/looks/IdeaScreens';
import { LookDetail } from '../src/features/looks/LookDetail';
import { LooksView } from '../src/features/looks/LooksView';
import { StylePiece } from '../src/features/looks/StylePiece';
import { localDate } from '../src/features/looks/saved-looks';
import { ME, mockFetch, renderWithApi } from './support/api';
import { IDEA_ID, idea, JOB_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const job = (status: string, stage: string) => ({
  id: JOB_ID,
  kind: 'key_piece',
  status,
  stage,
  output: {},
  error: null,
  cancelRequested: false,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
  finishedAt: null,
});

test('styling a chosen piece sends a piece anchor with the occasion and opens the job', async () => {
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'POST /looks/generate': { jobId: JOB_ID, status: 'queued' },
  });
  await renderWithApi(<StylePiece initialPieceId={PIECE_ID} />);
  expect(await screen.findByRole('radio', { name: 'Camel wool coat', checked: true })).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(looks.stylePiece.occasionLabel), 'Dinner');
  await fireEvent.press(screen.getByRole('button', { name: looks.stylePiece.start }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/looks/job/${JOB_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    anchor: { type: 'piece', pieceId: PIECE_ID },
    occasion: 'Dinner',
  });
});

test('describing a piece replaces the chosen one; nothing chosen means no start', async () => {
  mockFetch({ 'GET /wardrobe/items': { items: [], nextCursor: null } });
  await renderWithApi(<StylePiece />);
  const start = await screen.findByRole('button', { name: looks.stylePiece.start });
  expect(start.props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText(looks.stylePiece.describe), 'white shirt');
  expect(
    screen.getByRole('button', { name: looks.stylePiece.start }).props.accessibilityState.disabled,
  ).toBe(false);
});

test('a running job shows progress, then the three ways once its idea lands', async () => {
  mockFetch({
    [`GET /jobs/${JOB_ID}`]: { ...job('running', 'images'), output: { ideaId: IDEA_ID } },
    [`GET /looks/ideas/${IDEA_ID}`]: idea({ frames: [] }),
  });
  await renderWithApi(<JobIdeaScreen jobId={JOB_ID} />);
  expect(await screen.findByText('Look 1')).toBeTruthy();
  expect(screen.getByText('Look 3')).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: ui.progress.dressing })).toBeTruthy();
});

test('a failed job with no idea says so', async () => {
  mockFetch({
    [`GET /jobs/${JOB_ID}`]: { ...job('failed', 'text'), error: 'ai_timeout' },
  });
  await renderWithApi(<JobIdeaScreen jobId={JOB_ID} />);
  expect(await screen.findByText('Robes couldn’t finish that. Please try again.')).toBeTruthy();
});

test('an idea can be saved, and removing it goes back', async () => {
  const calls = mockFetch({
    [`GET /looks/ideas/${IDEA_ID}`]: idea(),
    [`POST /looks/ideas/${IDEA_ID}/save`]: idea({
      savedAt: '2026-09-24T10:05:00.000Z',
      expiresAt: null,
    }),
    [`DELETE /looks/ideas/${IDEA_ID}`]: { ok: true },
    'GET /looks/ideas': { items: [] },
  });
  await renderWithApi(<IdeaScreen id={IDEA_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.result.save }));
  expect(await screen.findByRole('button', { name: looks.result.saved })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: looks.result.remove }));
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
});

test('Looks splits ideas from saved ones; Saved also lists her built looks', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /looks': { items: [look()], nextCursor: null },
    'GET /looks/ideas': {
      items: [
        idea({ title: 'Unsaved idea' }),
        idea({
          id: '88888888-8888-4888-8888-888888888888',
          title: 'Kept look',
          savedAt: '2026-09-24T10:05:00.000Z',
          expiresAt: null,
        }),
      ],
    },
  });
  await renderWithApi(<LooksView />);
  expect(await screen.findByText('Unsaved idea')).toBeTruthy();
  expect(screen.queryByText('Kept look')).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: 'Saved' }));
  expect(await screen.findByText('Kept look')).toBeTruthy();
  expect(screen.getByText('Weekend navy')).toBeTruthy();
  expect(screen.queryByText('Unsaved idea')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Weekend navy' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);
});

test('a saved look can be worn today (her local date) and removed with Undo', async () => {
  const today = localDate();
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`POST /looks/${LOOK_ID}/wears`]: {
      id: JOB_ID,
      lookId: LOOK_ID,
      wornOn: today,
      pieceIds: [PIECE_ID],
    },
    [`DELETE /looks/${LOOK_ID}`]: { ok: true },
    [`POST /looks/${LOOK_ID}/restore`]: look(),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByText(looks.look.worn(2))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: looks.look.wearToday }));
  expect(await screen.findByText(looks.look.woreToday)).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/wears'))?.body).toEqual({ wornOn: today });

  await fireEvent.press(screen.getByRole('button', { name: looks.result.remove }));
  expect(mockRouter.back).toHaveBeenCalled();
  expect(await screen.findByText(looks.look.removed)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

test('localDate is the device calendar day, not UTC', () => {
  expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
});

test('one of the three ways can be kept as a look, which then opens', async () => {
  const calls = mockFetch({
    [`GET /looks/ideas/${IDEA_ID}`]: idea(),
    [`POST /looks/ideas/${IDEA_ID}/looks`]: look({ name: 'Look 2' }),
    'GET /looks': { items: [], nextCursor: null },
    'GET /looks/ideas': { items: [] },
  });
  await renderWithApi(<IdeaScreen id={IDEA_ID} />);
  await screen.findByText('Look 2');
  // The pager carries ONE action row, for the card in the middle; the dots move it.
  expect(screen.getAllByRole('button', { name: looks.saveWay })).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: keyPiece.way(2, 3) }));
  await fireEvent.press(screen.getByRole('button', { name: looks.saveWay }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
  expect(calls.find((c) => c.path.endsWith('/looks') && c.method === 'POST')?.body).toEqual({
    wayIdx: 1,
  });
  expect(await screen.findByText(looks.savedWay)).toBeTruthy();
});

test('the looks beyond the first are pictured when she asks', async () => {
  let asked = false;
  const frames = (second: 'deferred' | 'pending') => [
    { idx: 0, status: 'ready' as const, image: piece().image },
    { idx: 1, status: second, image: null },
    { idx: 2, status: 'deferred' as const, image: null },
  ];
  const calls = mockFetch({
    [`GET /looks/ideas/${IDEA_ID}`]: () => idea({ frames: frames(asked ? 'pending' : 'deferred') }),
    [`POST /looks/ideas/${IDEA_ID}/frames/1`]: () => {
      asked = true;
      return { jobId: JOB_ID, status: 'queued' };
    },
  });
  await renderWithApi(<IdeaScreen id={IDEA_ID} />);
  const show = await screen.findAllByRole('button', { name: looks.result.showLook });
  expect(show).toHaveLength(2);
  await fireEvent.press(show[0] as never);
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/frames/1'))).toBe(true),
  );
  await waitFor(() =>
    expect(screen.queryAllByRole('button', { name: looks.result.showLook })).toHaveLength(1),
  );
});

test('a card opens its sheet piece by piece, her own pieces marked', async () => {
  const withPieces = idea({
    anchor: { type: 'piece', pieceId: PIECE_ID, label: 'Camel wool coat' },
  });
  const first = withPieces.ways[0];
  if (first) {
    first.pieces = [
      {
        name: 'Camel wool coat',
        category: 'Outerwear',
        color: 'camel',
        colorHex: null,
        role: 'anchor',
        brand: '',
        retailerHint: '',
        pricePoint: '',
        pieceId: PIECE_ID,
      },
      {
        name: 'Black loafers',
        category: 'Shoes',
        color: 'black',
        colorHex: null,
        role: 'canvas',
        brand: 'COS',
        retailerHint: '',
        pricePoint: '€89',
        pieceId: null,
      },
    ];
  }
  mockFetch({
    [`GET /looks/ideas/${IDEA_ID}`]: withPieces,
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
  });
  await renderWithApi(<IdeaScreen id={IDEA_ID} />);
  expect(await screen.findByText(keyPiece.eyebrowYours)).toBeTruthy();
  expect(screen.getByText(keyPiece.pill(2, 1))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: keyPiece.open('Look 1') }));
  expect(await screen.findByText(keyPiece.inWardrobe)).toBeTruthy();
  expect(screen.getByText('Shoes · COS €89')).toBeTruthy();
  expect(screen.getByText('Black loafers')).toBeTruthy();
});
