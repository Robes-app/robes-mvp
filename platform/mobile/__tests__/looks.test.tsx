import { looks, ui } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { IdeaScreen, JobIdeaScreen } from '../src/features/looks/IdeaScreens';
import { LooksView } from '../src/features/looks/LooksView';
import { StylePiece } from '../src/features/looks/StylePiece';
import { ME, mockFetch, renderWithApi } from './support/api';
import { IDEA_ID, idea, JOB_ID, PIECE_ID, piece } from './support/fixtures';
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
    [`GET /jobs/${JOB_ID}`]: job('running', 'images'),
    'GET /looks/ideas': { items: [idea({ frames: [] })] },
  });
  await renderWithApi(<JobIdeaScreen jobId={JOB_ID} />);
  expect(await screen.findByText('Look 1')).toBeTruthy();
  expect(screen.getByText('Look 3')).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: ui.progress.dressing })).toBeTruthy();
});

test('a failed job with no idea says so', async () => {
  mockFetch({
    [`GET /jobs/${JOB_ID}`]: { ...job('failed', 'text'), error: 'ai_timeout' },
    'GET /looks/ideas': { items: [] },
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

test('Looks splits ideas from saved ones', async () => {
  mockFetch({
    'GET /me': ME,
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
  expect(screen.queryByText('Unsaved idea')).toBeNull();
});
