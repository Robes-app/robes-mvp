import { keyPiece, lookbook, looks, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { IdeaScreen, JobIdeaScreen } from '../src/features/looks/IdeaScreens';
import { LookDetail } from '../src/features/looks/LookDetail';
import { StylePiece } from '../src/features/looks/StylePiece';
import { localDate } from '../src/features/looks/saved-looks';
import { mockFetch, renderWithApi } from './support/api';
import {
  IDEA_ID,
  idea,
  JOB_ID,
  LOOK_ID,
  look,
  modelData,
  PIECE_ID,
  piece,
} from './support/fixtures';
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
  // She has pieces filed, so the ask waits on where its pieces come from (legacy 2026-10-19).
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.prompt.balance.mix }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/looks/job/${JOB_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    anchor: { type: 'piece', pieceId: PIECE_ID },
    occasion: 'Dinner',
    balance: 'mix',
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

test('a saved look is worn today through the diary sheet (her local date) and removed with Undo', async () => {
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
  // One meta line under the title carries the wears; the old second "Worn 2 times" line is gone.
  expect(await screen.findByText(/2 wears/)).toBeTruthy();
  expect(screen.queryByText(looks.look.worn(2))).toBeNull();
  // No wear buttons on the page (27 Oct): the diary on the picture logs it, on any day.
  expect(screen.queryByRole('button', { name: 'Wear it today' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Wear on a day' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save as new' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.card.diary }));
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.diary.woreToday }));
  // The record reads /wears too, so name the method: the wear itself is the POST.
  expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/wears'))?.body).toEqual({
    wornOn: today,
  });

  await fireEvent.press(screen.getByRole('button', { name: looks.page.remove }));
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

test('her photograph and her model: You · Model picks the record and saves it at once', async () => {
  const model = piece().image;
  if (!model) throw new Error('fixture piece has an image');
  const photo = { ...model, assetId: '99999999-9999-4999-8999-999999999999' };
  const both = look({ photo, model, record: 'photo', image: photo });
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: both,
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...both,
      ...JSON.parse(String(init.body)),
      image: model,
    }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByText(looks.page.record.kept)).toBeTruthy();
  // With her photograph kept, the camera is ↻ and the hint is gone.
  expect(screen.getByRole('button', { name: looks.page.replacePhoto })).toBeTruthy();
  expect(screen.queryByText(looks.page.photoNote)).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: looks.page.record.model }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ record: 'model' }),
  );
});

test('before her photograph: the hint stands, no You · Model; Edit tags sets the season', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...look(),
      ...JSON.parse(String(init.body)),
    }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByText(looks.page.photoNote)).toBeTruthy();
  expect(screen.queryByText(looks.page.record.kept)).toBeNull();
  expect(screen.getByRole('button', { name: looks.page.addPhoto })).toBeTruthy();
  // The record, then "Delete this look" as a link — no wear or save-as-new buttons (27 Oct).
  expect(screen.getByRole('button', { name: looks.page.remove })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: looks.page.editTags }));
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.refine.seasons.autumn_winter }),
  );
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
      climateBand: 'autumn_winter',
    }),
  );
});

test('her photograph on a look her model has not worn: You · Model stands, and Model dresses her', async () => {
  const photo = piece().image;
  if (!photo) throw new Error('fixture piece has an image');
  const mine = look({ photo, model: null, record: 'photo', image: photo, onModel: null });
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: mine,
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...mine,
      ...JSON.parse(String(init.body)),
    }),
    [`POST /looks/${LOOK_ID}/render`]: { jobId: '77777777-7777-4777-8777-777777777777' },
    'GET /me/model': modelData({ filed: true, cell: { status: 'ready', imageUrl: null } }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  // Beta dressed every saved look: with her model on file, the Model side is hers to ask for.
  const modelSide = await screen.findByRole('radio', { name: looks.page.record.model });
  await fireEvent.press(modelSide);
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/render'))).toBeTruthy(),
  );
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ record: 'model' });
});
