import { keyPiece, lookbook, looks, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DraftLook } from '../src/features/looks/DraftLook';
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
  // No facts line under the photo (D16), and no "Worn 2 times" line either.
  expect(await screen.findByRole('button', { name: lookbook.savedLook.schedule })).toBeTruthy();
  expect(screen.queryByText(/2 wears/)).toBeNull();
  expect(screen.queryByText(looks.look.worn(2))).toBeNull();
  // No wear buttons on the page (27 Oct): the diary on the picture logs it, on any day.
  expect(screen.queryByRole('button', { name: 'Wear it today' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Wear on a day' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save as new' })).toBeNull();
  // Schedule look (Felix 3e) is the one ink button, and opens the diary.
  await fireEvent.press(screen.getByRole('button', { name: lookbook.savedLook.schedule }));
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.diary.woreToday }));
  // The record reads /wears too, so name the method: the wear itself is the POST.
  expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/wears'))?.body).toEqual({
    wornOn: today,
  });
  // Beta says so (L10): today's wear is "Worn today ✓", never silence.
  expect(await screen.findByText(lookbook.diary.wornToday)).toBeTruthy();

  // Delete lives in the draft sheet's edit mode (D9, D14): Edit look opens it.
  expect(screen.queryByRole('button', { name: looks.page.remove })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.savedLook.edit }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}`);
});

test('Delete this look, in the draft sheet, asks first and lands behind Undo', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`DELETE /looks/${LOOK_ID}`]: { ok: true },
    [`POST /looks/${LOOK_ID}/restore`]: look(),
    'GET /looks': { items: [], nextCursor: null },
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  await fireEvent.press(await screen.findByText(lookbook.draftLook.delete));
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.savedLook.delete }));
  expect(mockRouter.replace).toHaveBeenCalledWith('/looks');
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

test('the image stack (D13): her photographs behind Robes’ picture; a tap picks the lead, Done keeps it', async () => {
  const model = piece().image;
  if (!model) throw new Error('fixture piece has an image');
  const photo = { ...model, assetId: '99999999-9999-4999-8999-999999999999' };
  const IMG = '88888888-8888-4888-8888-888888888888';
  const both = look({
    photo,
    model,
    record: 'photo',
    image: photo,
    images: [{ id: IMG, image: photo, position: 0 }],
  });
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: both,
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`POST /looks/${LOOK_ID}/images/cover`]: { ...both, record: 'model', image: model },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  // The badge counts her photographs and opens the manager; no You · Model, no hint.
  expect(screen.queryByText(looks.page.photoNote)).toBeNull();
  await fireEvent.press(await screen.findByTestId('saved-look-stack'));
  expect(await screen.findByTestId('image-manager')).toBeTruthy();
  // Robes' picture is a card she can bring to the front, never remove.
  expect(screen.queryByLabelText(new RegExp(lookbook.savedLook.manager.remove))).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', {
      name: lookbook.savedLook.manager.lead(lookbook.savedLook.manager.robes),
    }),
  );
  await fireEvent.press(screen.getByTestId('image-manager-done'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/images/cover'))?.body).toEqual({ imageId: null }),
  );
  expect(screen.queryByTestId('image-manager')).toBeNull();
});

test('Details › Seasons picks the four seasons (D12); the row reads them back', async () => {
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
  await fireEvent.press(await screen.findByRole('tab', { name: lookbook.savedLook.tabs.details }));
  await fireEvent.press(await screen.findByTestId('details-seasons'));
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.savedLook.seasonsView.names.autumn }),
  );
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ seasons: ['autumn'] }),
  );
});

test('a look her model has not worn starts dressing on open, on whatever model she stands on', async () => {
  const photo = piece().image;
  if (!photo) throw new Error('fixture piece has an image');
  const mine = look({ photo, model: null, record: 'photo', image: photo, onModel: null });
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: mine,
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`POST /looks/${LOOK_ID}/render`]: { jobId: '77777777-7777-4777-8777-777777777777' },
    // No twin, no filed model: she stands on the generic Robes model, which can still wear it.
    'GET /me/model': modelData({
      filed: false,
      stand: { imageUrl: 'https://media.test/generic.webp', generic: true },
    }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  // Beta dressed every saved look on whatever model she stands on: it starts by itself.
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/render'))).toBeTruthy(),
  );
});

test('Update on a saved look her model wears asks her model to wear the new rack', async () => {
  const jeans = piece({ id: '99999999-9999-4999-8999-999999999999', label: 'Straight jeans' });
  const mine = look({
    pieces: [
      { piece: piece(), slot: null, role: null },
      { piece: jeans, slot: null, role: null },
    ],
    // Already drawn on her model, so opening it starts nothing; only Update should.
    model: piece().image,
    onModel: 'ready',
  });
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: mine,
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    [`PATCH /looks/${LOOK_ID}`]: { ...mine, pieces: [mine.pieces[0]] },
    [`POST /looks/${LOOK_ID}/render`]: { jobId: '77777777-7777-4777-8777-777777777777' },
    'GET /me/model': modelData({
      stand: { imageUrl: 'https://media.test/generic.webp', generic: true },
    }),
    'GET /looks': { items: [], nextCursor: null },
  });
  // The saved look edits in the draft sheet (D14): the rack is worked there, Update keeps it.
  await renderWithApi(<DraftLook id={LOOK_ID} presentation="sheet" onClose={() => undefined} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.rack.remove('Straight jeans') }),
  );
  // The piece taken off leaves the picture behind, so Update draws it after (D6).
  await fireEvent.press(screen.getByTestId('draft-done'));
  // The picture must not keep showing the jeans she took off (beta re-dressed the model live).
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/render'))).toBeTruthy(),
  );
  const patch = calls.findIndex((c) => c.method === 'PATCH');
  const render = calls.findIndex((c) => c.method === 'POST' && c.path.endsWith('/render'));
  expect(patch).toBeGreaterThan(-1);
  expect(patch).toBeLessThan(render);
});
