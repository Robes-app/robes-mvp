import type { Look, LookSet } from '@robes/contracts';
import { diary, filters, lookbook, ui, wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Deck, JobDeck } from '../src/features/looks/Deck';
import { LookScreen } from '../src/features/looks/LookScreen';
import { LooksView } from '../src/features/looks/LooksView';
import { localDate } from '../src/features/looks/saved-looks';
import { nativeAnalytics } from '../src/lib/analytics';
import { ME, mockFetch, renderWithApi } from './support/api';
import { drawnOnAsk } from './support/drawn';
import { JOB_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { openPrompt } from './support/prompt';
import { Providers } from './support/providers';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());
// Every call site reports through the consent-gated client (observability.test.ts proves the gate).
const track = jest.spyOn(nativeAnalytics, 'track');

const SET_ID = '77777777-7777-4777-8777-777777777777';
const SECOND = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const JEAN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const frame = piece().image;
const anchor = { id: PIECE_ID, label: 'Camel wool coat', brand: null, image: frame };
const mules = {
  key: 'p-aaaa1111',
  name: 'Black pointed mules',
  category: 'Shoes' as const,
  color: 'black',
  brand: 'Toteme',
  retailerHint: 'toteme.com',
  pricePoint: '€390',
  role: 'exclamation' as const,
  wishlisted: false,
  wishlistItemId: null,
  capture: null,
};
// No twin on file, so every frame stands on a generic model and carries its badge.
const GENERIC_MODEL = {
  filed: false,
  presence: 'woman',
  skin: 3,
  hair: 1,
  line: null,
  frame: null,
  source: 'hand',
  reads: { colour: false, silhouette: false },
  cellId: 'w-s3-h1-nt',
  cell: { status: 'none', imageUrl: null },
  swatches: { skin: [], hair: [] },
  skinSet: false,
  hairSet: false,
  adj: { shoulders: null, bust: null, hips: null },
  closeUpUrl: null,
  twin: { status: 'none', current: false, imageUrl: null },
};
const suggestion = (o: Partial<Look> = {}): Look =>
  look({
    status: 'suggested',
    name: 'Garden party',
    nameProvisional: true,
    note: 'A long lunch in the sun. The jacket open. Easy. Unhurried.',
    source: 'generated',
    image: frame,
    frame: true,
    composedByRobes: true,
    proposals: [mules],
    anchor,
    setId: SET_ID,
    setIndex: 0,
    ...o,
  });
const byStatus = (lists: Partial<Record<string, Look[]>>) => (_: RequestInit, url: string) => ({
  items: lists[new URL(url).searchParams.get('status') ?? 'saved'] ?? [],
  nextCursor: null,
});
const job = (output: Record<string, unknown>, status = 'succeeded') => ({
  id: JOB_ID,
  kind: 'look_ask',
  status,
  stage: 'done',
  output,
  error: null,
  cancelRequested: false,
  createdAt: '2026-10-15T10:00:00.000Z',
  updatedAt: '2026-10-15T10:00:00.000Z',
  finishedAt: '2026-10-15T10:00:01.000Z',
});

test('the Lookbook: Saved leads with drafts in progress; a suggestion is deleted from its menu, asked first, with Undo', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({
      saved: [look()],
      draft: [look({ id: SECOND, status: 'draft', nameProvisional: true, name: 'A new look' })],
      suggested: [suggestion()],
    }),
    [`DELETE /looks/${LOOK_ID}`]: { ok: true },
    [`POST /looks/${LOOK_ID}/restore`]: suggestion(),
  });
  await renderWithApi(<LooksView />);
  expect(await screen.findByText('Weekend navy')).toBeTruthy();
  expect(screen.getByText(lookbook.inProgress)).toBeTruthy();
  expect(screen.getByText(lookbook.draftTile.untitled)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: `Draft: ${lookbook.draftTile.untitled}` }),
  );
  // A draft opens as its sheet (D14).
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${SECOND}`);

  await fireEvent.press(screen.getByRole('tab', { name: `${lookbook.tabs.suggested} 1` }));
  expect(await screen.findByText('Garden party')).toBeTruthy();
  expect(screen.queryByText('Weekend navy')).toBeNull();
  // Its long-press menu's Delete look asks first (design "Suggested looks" 07).
  await fireEvent.press(screen.getByRole('button', { name: lookbook.suggestedTile.menu.delete }));
  expect(await screen.findByText(lookbook.suggestedLook.deleteBody)).toBeTruthy();
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: lookbook.savedLook.delete }));
  expect(await screen.findByText(lookbook.removed)).toBeTruthy();
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

test('a seeded drop waiting: the Lookbook opens on Suggested under its header, each card signed by Robes', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({
      saved: [look()],
      suggested: [
        suggestion({ name: 'Red sequins', source: 'seed', seedId: 'xmas-2026', setId: null }),
      ],
    }),
  });
  await renderWithApi(<LooksView />);
  expect(await screen.findByText('Red sequins')).toBeTruthy();
  const drop = lookbook.seedDrops['xmas-2026'];
  expect(screen.getByText(drop?.title ?? '')).toBeTruthy();
  expect(screen.getByText(`${drop?.line} ${lookbook.seedKeep}`)).toBeTruthy();
  // The card: the photograph, the name, Suggested by Robes, and nothing on the photograph.
  expect(screen.getByText(lookbook.suggestedTile.by)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /for another look/ })).toBeNull();
  // Each tab counts what it holds (never as a fraction).
  expect(screen.getByRole('tab', { name: `${lookbook.tabs.saved} 1` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${lookbook.tabs.suggested} 1` })).toBeTruthy();
  // A tap on Saved stays on Saved.
  await fireEvent.press(screen.getByRole('tab', { name: `${lookbook.tabs.saved} 1` }));
  expect(await screen.findByText('Weekend navy')).toBeTruthy();
  expect(screen.queryByText(lookbook.seedKeep, { exact: false })).toBeNull();
});

test('a saved card on iOS: a tap opens the look; its long-press menu deletes with Undo, no ✕ at rest', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({ saved: [look()] }),
    [`DELETE /looks/${LOOK_ID}`]: { ok: true },
    [`POST /looks/${LOOK_ID}/restore`]: look(),
  });
  await renderWithApi(<LooksView />);
  expect(await screen.findByText('Weekend navy')).toBeTruthy();
  expect(screen.queryByRole('button', { name: lookbook.card.delete })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Weekend navy' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);
  await fireEvent.press(screen.getByRole('button', { name: lookbook.card.menu.delete }));
  expect(await screen.findByText(lookbook.removed)).toBeTruthy();
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith(`/looks/${LOOK_ID}`))).toBe(
      true,
    ),
  );
});

test('a suggested look is the saved look’s page, signed by Robes; Save look files its pieces and says so', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: suggestion(),
    [`POST /looks/${LOOK_ID}/save`]: suggestion({
      status: 'saved',
      proposals: [{ ...mules, wishlisted: true, wishlistItemId: SECOND }],
    }),
    'GET /looks': byStatus({}),
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // Felix 3e's anatomy (design "Suggested looks" 03): the back disc and the pill on the
  // photograph, Pieces · Details, the rows, and Save look beside the sparkle at the foot.
  expect(await screen.findByTestId('suggested-pill')).toBeTruthy();
  expect(screen.getByTestId('saved-look-back')).toBeTruthy();
  expect(screen.getByText(lookbook.suggestedTile.by)).toBeTruthy();
  expect(screen.getByText(lookbook.rack.shop('Toteme'))).toBeTruthy();
  expect(screen.getByText('€390')).toBeTruthy();
  expect(screen.queryByTestId('schedule-look')).toBeNull();
  const foot = within(screen.getByTestId('look-bar'));
  expect(foot.getByTestId('save-suggestion')).toBeTruthy();
  expect(foot.getByTestId('prompt-spark')).toBeTruthy();
  // The verdict stays (Annie, 24 Nov): what she thinks of a suggestion shapes her Style DNA.
  expect(screen.getByText(lookbook.verdict.title)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('save-suggestion'));
  expect(await screen.findByText(lookbook.savedSuggestion.title)).toBeTruthy();
  expect(screen.getByText(lookbook.savedSuggestion.body(1))).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/save'))?.body).toEqual({});
  // Nothing changed, so nothing is written or drawn before the save.
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  // Saved, she goes back to where she found it; View opens her wishlist.
  expect(mockRouter.back).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.savedSuggestion.view }));
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe?segment=wishlist');
  expect(track).toHaveBeenCalledWith('look_created', {
    from: 'suggested',
    pieces: 1,
    proposed: 1,
    anchored: true,
    changes: 0,
  });
});

test('a swap on a suggestion waits for Save look, which keeps it suggested until it saves', async () => {
  const COAT = '99999999-9999-4999-8999-999999999999';
  const coat = piece({ id: COAT, label: 'Navy wool coat' });
  const shown = suggestion({ pieces: [{ piece: piece(), slot: null, role: 'anchor' }] });
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: shown,
    [`PATCH /looks/${LOOK_ID}`]: shown,
    [`POST /looks/${LOOK_ID}/frame`]: { jobId: JOB_ID, status: 'queued' },
    [`POST /looks/${LOOK_ID}/save`]: suggestion({ status: 'saved' }),
    'GET /wardrobe/items': { items: [piece(), coat], nextCursor: null },
    'GET /looks': byStatus({}),
    'GET /looks/sets/:id': {},
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // At rest a piece to find carries its heart (design "Suggested looks" 03); the pencil is a
  // saved look's edit, swap and × with no heart (03b).
  expect(
    await screen.findByRole('button', { name: lookbook.rack.save('Black pointed mules') }),
  ).toBeTruthy();
  // A tap on a piece Robes picked opens it as a piece to find.
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.open('Black pointed mules') }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/look-piece/[id]/[key]',
    params: { id: LOOK_ID, key: mules.key },
  });
  await fireEvent.press(screen.getByTestId('rack-pencil'));
  expect(
    screen.queryByRole('button', { name: lookbook.rack.save('Black pointed mules') }),
  ).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  // The one PiecePicker (plan 2026-11-09 PR 9): a tick on the piece, then Swap it in.
  await fireEvent.press(
    await screen.findByRole('checkbox', { name: diary.flyout.pick('Navy wool coat') }),
  );
  await fireEvent.press(screen.getByTestId('picker-confirm'));
  // Nothing is written until Save look, which stays the one button.
  expect(await screen.findByText('Navy wool coat')).toBeTruthy();
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  expect(screen.queryByTestId('update-look')).toBeNull();
  await fireEvent.press(screen.getByTestId('save-suggestion'));
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/save'))).toBe(true));
  const patch = calls.find((c) => c.method === 'PATCH');
  expect(patch?.body).toMatchObject({ keepSuggested: true });
  expect(JSON.stringify(patch?.body)).toContain(COAT);
  expect(calls.findIndex((c) => c.method === 'PATCH')).toBeLessThan(
    calls.findIndex((c) => c.path.endsWith('/save')),
  );
});

test('a swap can take a wish: the WISHLIST tab stays open, and the wish lands as a piece to find', async () => {
  const WISH = '88888888-8888-4888-8888-888888888888';
  const wish = {
    id: WISH,
    label: 'Silk scarf',
    category: 'Accessories',
    categoryL2: null,
    categoryL3: null,
    color: 'ivory',
    brand: 'Toteme',
    note: null,
    price: 190,
    currency: 'EUR',
    size: null,
    sourceUrl: null,
    sourceLabel: 'toteme.com',
    image: null,
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T10:00:00.000Z',
  };
  const shown = suggestion({ pieces: [{ piece: piece(), slot: null, role: 'anchor' }] });
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: shown,
    [`PATCH /looks/${LOOK_ID}`]: shown,
    [`POST /looks/${LOOK_ID}/frame`]: { jobId: JOB_ID, status: 'queued' },
    [`POST /looks/${LOOK_ID}/save`]: suggestion({ status: 'saved' }),
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'GET /wishlist/items': { items: [wish], nextCursor: null },
    'GET /looks': byStatus({}),
    'GET /looks/sets/:id': {},
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('rack-pencil'));
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  const tab = await screen.findByRole('tab', { name: wardrobe.segments.wishlist });
  expect(tab.props.accessibilityState?.disabled).not.toBe(true);
  await fireEvent.press(tab);
  await fireEvent.press(
    await screen.findByRole('checkbox', { name: lookbook.draftLook.picker.pickWish('Silk scarf') }),
  );
  await fireEvent.press(screen.getByTestId('picker-confirm'));
  await fireEvent.press(await screen.findByTestId('save-suggestion'));
  const patches = () => calls.filter((c) => c.method === 'PATCH');
  await waitFor(() => expect(patches()).toHaveLength(1));
  // The coat leaves her pieces; the scarf stands in its place and role as a piece to find.
  const body = patches()[0]?.body as {
    pieces: unknown[];
    proposals: { wishlistItemId: string | null; role: string }[];
  };
  expect(body.pieces).toEqual([]);
  expect(body.proposals.find((p) => p.wishlistItemId === WISH)).toMatchObject({ role: 'anchor' });
});

// The feedback thread (look prompt PRD F): once a change lands Robes asks its one question; a
// thumbs down opens the reasons, and what she taps stands for her words on the next send.
test('after a change Robes asks; a thumbs down opens the reasons this look can have', async () => {
  const draft = look({
    status: 'draft',
    pieces: [{ piece: piece(), slot: null, role: 'anchor' }],
    proposals: [mules],
  });
  const swapped = {
    intent: 'swap',
    reply: 'Done. The dark jean is on the look now.',
    swaps: [
      {
        key: 'p-aaaa1111',
        to: { pieceId: JEAN, name: 'Dark straight jean', category: 'Bottoms', brand: null },
      },
    ],
    back: [],
    backAll: false,
    styled: [],
    draft: '',
    rule: '',
    noticed: false,
  };
  const drawn = drawnOnAsk(draft, JOB_ID);
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: drawn.get,
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: job({ ask: swapped }),
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...draft,
      ...JSON.parse(String(init.body)),
      proposals: [],
    }),
    [`POST /looks/${LOOK_ID}/render`]: drawn.render,
    'GET /looks': byStatus({}),
  });
  const fb = lookbook.draftLook.feedback;
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // No question before Robes has changed anything.
  await fireEvent.changeText(await openPrompt(), 'swap the mules');
  expect(screen.queryByTestId('look-feedback')).toBeNull();
  await fireEvent.press(screen.getByTestId('prompt-send'));
  // The change is on the rack and the picture is being dressed: Robes waits to ask (16 Nov).
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/render'))).toBe(true),
  );
  expect(screen.queryByText(fb.closer)).toBeNull();
  // The picture lands, and Robes asks once; after typed words, "Closer?" (docked prompt Q4).
  expect(await screen.findByText(fb.closer, {}, { timeout: 8000 })).toBeTruthy();
  expect(screen.queryByTestId('feedback-reasons')).toBeNull();
  // A thumbs down opens the reasons; the other thumb dims and takes no second answer (F5, F7).
  await fireEvent.press(screen.getByTestId('thumb-down'));
  expect(screen.getByText(fb.change)).toBeTruthy();
  expect(screen.getByTestId('thumb-down').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('thumb-up').props.accessibilityState.disabled).toBe(true);
  // This draft is for no day, so it carries no weather to be wrong for (F14); and Robes did not
  // make it from a brief, so there is nothing to restyle from (F13).
  expect(screen.queryByTestId('reason-weather')).toBeNull();
  expect(screen.queryByTestId('reason-restyle')).toBeNull();
  // A reason picked stands first with its ×, and the send stands ready on it alone (F10); the
  // send itself waits for the picture this change asked for.
  await fireEvent.press(screen.getByTestId('reason-dressy'));
  expect(screen.getByTestId('reason-dressy').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('reason-dressy').props.accessibilityLabel).toBe(
    fb.remove(fb.reasons.dressy.label),
  );
  expect(calls.filter((c) => c.path.endsWith('/ask'))).toHaveLength(1);
  // Counts and enums only: never her words.
  expect(nativeAnalytics.track).toHaveBeenCalledWith('look_feedback', {
    surface: 'draft',
    verdict: 'down',
    change_n: 1,
  });
}, 20_000);

test('a thumbs up ends it there: the like is kept, nothing is sent, saved or filed', async () => {
  const draft = look({
    status: 'draft',
    pieces: [{ piece: piece(), slot: null, role: 'anchor' }],
    proposals: [mules],
  });
  const drawn = drawnOnAsk(draft, JOB_ID);
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: drawn.get,
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: job({
      ask: {
        intent: 'swap',
        reply: 'Done.',
        swaps: [
          {
            key: 'p-aaaa1111',
            to: { pieceId: JEAN, name: 'Dark straight jean', category: 'Bottoms', brand: null },
          },
        ],
        back: [],
        backAll: false,
        styled: [],
        draft: '',
        rule: '',
        noticed: false,
      },
    }),
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...draft,
      ...JSON.parse(String(init.body)),
      proposals: [],
    }),
    [`POST /looks/${LOOK_ID}/render`]: drawn.render,
    'GET /looks': byStatus({}),
  });
  const fb = lookbook.draftLook.feedback;
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.changeText(await openPrompt(), 'swap the mules');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(await screen.findByText(fb.closer, {}, { timeout: 8000 })).toBeTruthy();
  const before = calls.length;
  await fireEvent.press(screen.getByTestId('thumb-up'));
  // The prompt closes: to its closed bar while the picture is still drawing, then to the sparkle
  // (look prompt PRD F6, F23). Either opens it again.
  await waitFor(() => expect(screen.queryByTestId('draft-prompt')).toBeNull());
  // The question waits for the picture (16 Nov), so here it has landed: the sparkle opens it.
  await openPrompt();
  expect(screen.getByTestId('thumb-up').props.accessibilityState.selected).toBe(true);
  expect(screen.queryByTestId('feedback-reasons')).toBeNull();
  // One answer per question.
  await fireEvent.press(screen.getByTestId('thumb-down'));
  expect(screen.queryByTestId('feedback-reasons')).toBeNull();
  // The one write is the like, kept in her style memory with her words (docked prompt Q10):
  // nothing is sent to Robes, saved to the look or filed.
  const writes = calls.slice(before).filter((c) => c.method !== 'GET');
  expect(writes.map((c) => c.path)).toEqual(['/api/v1/me/memory']);
  expect(writes[0]?.body).toMatchObject({
    kind: 'verdict',
    verdict: 1,
    surface: 'draft',
    lookId: expect.any(String),
    body: 'swap the mules',
  });
}, 20_000);

test('the look prompt lands a swap on a draft and remembers what it replaced', async () => {
  const draft = look({
    status: 'draft',
    pieces: [{ piece: piece(), slot: null, role: 'anchor' }],
    proposals: [mules],
  });
  const drawn = drawnOnAsk(draft, JOB_ID);
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: drawn.get,
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: job({
      ask: {
        intent: 'swap',
        reply: 'Done. The dark jean is on the look now.',
        swaps: [
          {
            key: 'p-aaaa1111',
            to: { pieceId: JEAN, name: 'Dark straight jean', category: 'Bottoms', brand: null },
          },
        ],
        back: [],
        backAll: false,
        styled: [],
        draft: '',
        rule: '',
        noticed: false,
      },
    }),
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => ({
      ...draft,
      ...JSON.parse(String(init.body)),
      proposals: [],
    }),
    [`POST /looks/${LOOK_ID}/render`]: drawn.render,
    'GET /looks': byStatus({}),
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // Every draft is the one DraftLook (D14): the prompt card's field feeds the thread.
  const field = await openPrompt();
  await fireEvent.changeText(field, 'swap the mules for my dark jean');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  // The change is seen on the rack, not told (redline 14 Nov): Robes only asks, "Closer?" after
  // typed words (docked prompt Q4).
  expect(
    await screen.findByText(lookbook.draftLook.feedback.closer, {}, { timeout: 8000 }),
  ).toBeTruthy();
  expect(screen.queryByText('Done. The dark jean is on the look now.')).toBeNull();
  const ask = calls.find((c) => c.path.endsWith('/ask'))?.body as {
    rack: unknown[];
    surface: string;
  };
  expect(ask.surface).toBe('draft');
  expect(ask.rack).toEqual([
    { key: PIECE_ID, pieceId: PIECE_ID, proposal: null, keep: false, was: null, styled: null },
    {
      key: 'p-aaaa1111',
      pieceId: null,
      proposal: { name: 'Black pointed mules', category: 'Shoes', brand: 'Toteme' },
      keep: false,
      was: null,
      styled: null,
    },
  ]);
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  const patch = calls.find((c) => c.method === 'PATCH')?.body as Record<string, unknown>;
  expect(patch.pieces).toEqual([
    { pieceId: PIECE_ID, role: 'anchor' },
    { pieceId: JEAN, role: 'exclamation' },
  ]);
  expect(patch.proposals).toEqual([]);
  expect(patch.edits).toEqual({
    [JEAN]: { was: expect.objectContaining({ name: 'Black pointed mules' }) },
  });
  // The swapped row carries the Swapped pill, its full line the label (docked prompt T3).
  expect(screen.getByLabelText(lookbook.rack.swappedFor('the black pointed mules'))).toBeTruthy();
  expect(screen.getByTestId('swapped-pill')).toHaveTextContent(lookbook.rack.swapped);
  // Sent from the drawer, the picture is drawn once the rack is answered and written (D14).
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/render'))).toBe(true),
  );
  expect(calls.findIndex((c) => c.method === 'PATCH')).toBeLessThan(
    calls.findIndex((c) => c.method === 'POST' && c.path.endsWith('/render')),
  );
  // Counts and enums only: never her words.
  expect(track).toHaveBeenCalledWith('look_prompt_sent', {
    surface: 'draft',
    chars: 'swap the mules for my dark jean'.length,
    from_draft: false,
    kind: 'typed',
    change_n: 1,
  });
  expect(track).toHaveBeenCalledWith('look_prompt_applied', {
    surface: 'draft',
    intent: 'swap',
    slots: 1,
  });
  expect(JSON.stringify(track.mock.calls)).not.toContain('dark jean');
}, 20_000);

test('a rule said in the prompt waits under Robes noticed; a vague ask is written into the field', async () => {
  let answer: Record<string, unknown> = {};
  mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: look({ status: 'draft' }),
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: () => job({ ask: answer }),
    'GET /looks': byStatus({}),
  });
  const base = {
    swaps: [],
    back: [],
    backAll: false,
    styled: [],
    noticed: false,
    draft: '',
    rule: '',
  };
  answer = {
    ...base,
    intent: 'rule',
    reply: 'Noted — keep it under Robes noticed and it becomes a rule.',
    rule: 'No grey',
    noticed: true,
  };
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // Every draft is the one DraftLook (D14): the prompt card's field feeds the thread.
  const field = await openPrompt();
  await fireEvent.changeText(field, 'never grey');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(await screen.findByText(lookbook.prompt.noticed)).toBeTruthy();
});

test('keep or pass: a pass waits behind Undo; the end counts what she kept', async () => {
  const looks = [suggestion(), suggestion({ id: SECOND, name: 'City dinner', setIndex: 1 })];
  const set: LookSet = {
    id: SET_ID,
    mode: 'piece',
    prompt: null,
    anchor,
    dateHint: null,
    jobId: JOB_ID,
    looks,
  };
  const calls = mockFetch({
    'GET /me': ME,
    'GET /me/model': { filed: false },
    [`GET /looks/sets/${SET_ID}`]: set,
    [`DELETE /looks/${SECOND}`]: { ok: true },
    [`POST /looks/${SECOND}/restore`]: looks[1],
    'GET /looks': byStatus({}),
  });
  await renderWithApi(<Deck setId={SET_ID} />);
  expect(await screen.findByText(`Your camel wool coat, ${lookbook.deck.titleTail}`)).toBeTruthy();
  expect(await screen.findByText('Garden party')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.keep }));
  expect(await screen.findByText('City dinner')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.pass }));
  expect(await screen.findByText(lookbook.passed)).toBeTruthy();
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  // Undo puts the passed card back on top.
  expect(await screen.findByText('City dinner')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.keep }));
  expect(await screen.findByText(lookbook.deck.kept(2))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.see }));
  expect(mockRouter.replace).toHaveBeenCalledWith('/looks?tab=suggested');
  expect(calls.some((c) => c.path.endsWith(`/${SECOND}/restore`))).toBe(true);
});

test('the deck leaves the model line to the card badge, whose tap never decides the card', async () => {
  const set: LookSet = {
    id: SET_ID,
    mode: 'piece',
    prompt: null,
    anchor,
    dateHint: null,
    jobId: JOB_ID,
    // Drawn on a Robes model: the card wears the tag.
    looks: [suggestion({ onRobesModel: true })],
  };
  mockFetch({
    'GET /me': ME,
    'GET /me/model': GENERIC_MODEL,
    [`GET /looks/sets/${SET_ID}`]: set,
    'GET /looks': byStatus({}),
  });
  await renderWithApi(<Deck setId={SET_ID} />);
  expect(await screen.findByText('Garden party')).toBeTruthy();
  expect(screen.queryByText(lookbook.deck.modelYours)).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.robesModelLabel }));
  expect(await screen.findByTestId('robes-model-sheet')).toBeTruthy();
  // Closing the sheet keeps the deck where it was: neither kept nor passed.
  await fireEvent.press(screen.getByRole('button', { name: ui.close }));
  // Neither kept nor passed: the card she was on is still the card she is on.
  expect(screen.getByText('Garden party')).toBeTruthy();
  expect(screen.queryByText(lookbook.deck.kept(0))).toBeNull();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

// The scanner's three lists (legacy): a piece, her words, and the overlay before the set lands.
// Only the overlay names who wears the looks — the deck's own lists never do.
const dressingSet = (over: Partial<LookSet> = {}): LookSet => ({
  id: SET_ID,
  mode: 'piece',
  prompt: null,
  anchor,
  dateHint: null,
  jobId: JOB_ID,
  looks: [],
  ...over,
});

test.each([
  ['a piece', dressingSet(), lookbook.deck.scanPiece[1]],
  [
    'her words',
    dressingSet({ mode: 'prompt', anchor: null, prompt: 'dinner' }),
    lookbook.deck.scanPrompt[1],
  ],
])('the deck dresses to the lines for %s, never the overlay’s', async (_label, set, second) => {
  mockFetch({
    'GET /me': ME,
    'GET /me/model': GENERIC_MODEL,
    [`GET /looks/sets/${SET_ID}`]: set,
    [`GET /jobs/${JOB_ID}`]: job({ setId: SET_ID }, 'running'),
    'GET /looks': byStatus({}),
  });
  await renderWithApi(<Deck setId={SET_ID} />);
  expect(await screen.findByTestId('deck-dressing')).toBeTruthy();
  expect(screen.getByText(lookbook.deck.scanPiece[0] as string)).toBeTruthy();
  // One beat on: the line that belongs to this list alone.
  expect(await screen.findByText(second as string, {}, { timeout: 4000 })).toBeTruthy();
  expect(screen.queryByText(lookbook.deck.scanGeneric)).toBeNull();
});

test('a verdict on a suggestion lands in her memory; Not quite lets the look go', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: suggestion(),
    'POST /me/memory': { ok: true },
    [`DELETE /looks/${LOOK_ID}`]: { ok: true },
    'GET /looks': byStatus({}),
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.verdict.up }));
  expect(await screen.findByText(lookbook.verdict.noted)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.verdict.down }));
  await fireEvent.changeText(screen.getByLabelText(lookbook.verdict.ask), 'Too formal for me');
  await fireEvent.press(screen.getByRole('button', { name: lookbook.verdict.send }));
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  expect(calls.filter((c) => c.path.endsWith('/me/memory')).map((c) => c.body)).toEqual([
    { kind: 'verdict', verdict: 1, surface: 'suggested', subject: 'Garden party', lookId: LOOK_ID },
    {
      kind: 'verdict',
      verdict: 0,
      body: 'Too formal for me',
      surface: 'suggested',
      subject: 'Garden party',
      lookId: LOOK_ID,
    },
  ]);
  // Let go, she is back on Suggested.
  expect(mockRouter.replace).toHaveBeenCalledWith('/looks?tab=suggested');
});

test('passing every card ends the deck (no endless dressing), and nothing polls after', async () => {
  const passed = new Set<string>();
  const looks = [suggestion(), suggestion({ id: SECOND, name: 'City dinner', setIndex: 1 })];
  const set = (): LookSet => ({
    id: SET_ID,
    mode: 'piece',
    prompt: null,
    anchor,
    dateHint: null,
    jobId: JOB_ID,
    looks: looks.filter((l) => !passed.has(l.id)),
  });
  const calls = mockFetch({
    'GET /me': ME,
    'GET /me/model': { filed: false },
    [`GET /looks/sets/${SET_ID}`]: () => set(),
    [`GET /jobs/${JOB_ID}`]: job({ setId: SET_ID }),
    [`DELETE /looks/${LOOK_ID}`]: () => {
      passed.add(LOOK_ID);
      return { ok: true };
    },
    [`DELETE /looks/${SECOND}`]: () => {
      passed.add(SECOND);
      return { ok: true };
    },
    'GET /looks': byStatus({}),
  });
  await renderWithApi(<Deck setId={SET_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.deck.pass }));
  await screen.findByText('City dinner');
  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.pass }));
  expect(await screen.findByText(lookbook.deck.kept(0))).toBeTruthy();
  expect(screen.queryByTestId('deck-dressing')).toBeNull();
  const sets = calls.filter((c) => c.path.endsWith(`/sets/${SET_ID}`)).length;
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1700));
  });
  expect(calls.filter((c) => c.path.endsWith(`/sets/${SET_ID}`)).length).toBeLessThanOrEqual(
    sets + 1,
  );
  expect(screen.getByText(lookbook.deck.kept(0))).toBeTruthy();
});

test('a styling job that failed after its looks were written still opens the deck', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /me/model': { filed: false },
    [`GET /jobs/${JOB_ID}`]: { ...job({ setId: SET_ID }, 'failed'), error: 'timeout' },
    [`GET /looks/sets/${SET_ID}`]: {
      id: SET_ID,
      mode: 'piece',
      prompt: null,
      anchor,
      dateHint: null,
      jobId: JOB_ID,
      looks: [suggestion()],
    },
  });
  await renderWithApi(<JobDeck jobId={JOB_ID} />);
  expect(await screen.findByText('Garden party')).toBeTruthy();
  expect(screen.queryByText(lookbook.deck.failed)).toBeNull();
});

test('a door naming the Suggested tab switches it while Looks is mounted', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({ saved: [look()], suggested: [suggestion()] }),
  });
  const view = await renderWithApi(<LooksView />);
  expect(await screen.findByText('Weekend navy')).toBeTruthy();
  mockParams.tab = 'suggested';
  await view.rerender(
    <Providers queryClient={view.queryClient}>
      <LooksView />
    </Providers>,
  );
  expect(await screen.findByText('Garden party')).toBeTruthy();
  delete mockParams.tab;
});

test('the Lookbook: cards read wears and seasons, drafts read as started, suggestions are signed by Robes', async () => {
  const id = (n: number) => `dddddddd-dddd-4ddd-8ddd-00000000000${n}`;
  mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({
      saved: [
        look({ id: id(1), name: 'Never worn', timesWorn: 0, lastWornOn: null, seasons: [] }),
        look({ id: id(2), name: 'Worn in August', timesWorn: 3, seasons: ['autumn', 'winter'] }),
      ],
      draft: [look({ id: SECOND, status: 'draft', name: 'Minion Day' })],
      suggested: [suggestion(), suggestion({ id: JEAN, name: 'Gallery night', anchor: null })],
    }),
  });
  await renderWithApi(<LooksView />);
  await screen.findByText('Worn in August');
  // The card's line (PRD rev 3 §5.2): the wears or New, then the seasons, Year round when none.
  expect(screen.getByText(`3 · ${filters.seasons.autumn}, ${filters.seasons.winter}`)).toBeTruthy();
  expect(screen.getByText(`New · ${filters.seasons.year_round}`)).toBeTruthy();
  expect(screen.getByText(/^Not saved · started /)).toBeTruthy();
  // The filter row stands over the grid on both tabs; there is no sort.
  expect(screen.getByTestId('lookbook-filter-row')).toBeTruthy();
  expect(screen.getByRole('button', { name: ui.filter })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Sort/ })).toBeNull();

  await fireEvent.press(screen.getByRole('tab', { name: `${lookbook.tabs.suggested} 2` }));
  await screen.findByText('Gallery night');
  // Every suggestion is signed by Robes, and nothing sits on its photograph.
  expect(screen.getAllByText(lookbook.suggestedTile.by)).toHaveLength(2);
  expect(
    screen.queryByTestId(`suggested-${JEAN}-quote`, { includeHiddenElements: true }),
  ).toBeNull();
  expect(screen.queryByRole('button', { name: /^Your camel/ })).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.suggestedTile.label('Gallery night') }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${JEAN}`);
});

test('a quick chip narrows the grid live; nothing left reads No looks match; a tile wears no Robes model tag', async () => {
  const id = (n: number) => `dddddddd-dddd-4ddd-8ddd-00000000000${n}`;
  mockFetch({
    'GET /looks': byStatus({
      saved: [
        look({ id: id(1), name: 'Office', onRobesModel: true, tags: ['Work'] }),
        look({ id: id(2), name: 'Sunday', tags: ['Weekend'] }),
      ],
    }),
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LooksView />);
  await screen.findByText('Office');
  // The tag lives on the saved look itself (Annie, 5 Nov), never on a tile standing in for it.
  expect(screen.queryByTestId('robes-model-tag')).toBeNull();
  expect(screen.queryByRole('button', { name: lookbook.deck.robesModelLabel })).toBeNull();
  // Work 1 · Weekend 1 · Active 0 (disabled).
  await fireEvent.press(screen.getByRole('button', { name: 'Work 1' }));
  expect(screen.queryByText('Sunday')).toBeNull();
  expect(screen.getByText('Office')).toBeTruthy();
  const active = screen.getByRole('button', { name: 'Active 0' });
  expect(active.props.accessibilityState).toEqual({ selected: false, disabled: true });
  // The sheet's option pills carry faceted counts: Travel reads 0, and picking it ORs with Work
  // (one look still shows); Clear lets both go.
  await fireEvent.press(screen.getByRole('button', { name: ui.filter }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Travel 0' }));
  expect(screen.getByRole('button', { name: filters.showLooks(1) })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ui.clear }));
  expect(await screen.findByRole('button', { name: filters.showLooks(2) })).toBeTruthy();
});

test('a suggestion’s menu saves it; + opens New Look; an empty Saved says so', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({ suggested: [suggestion()] }),
    [`POST /looks/${LOOK_ID}/save`]: look({
      status: 'saved',
      proposals: [{ ...mules, wishlisted: true, wishlistItemId: SECOND }],
    }),
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LooksView />);
  expect(await screen.findByText(lookbook.savedEmpty.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: `+ ${lookbook.newLook}` }));
  expect(await screen.findByTestId('new-look-sheet')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('new-look-pieces'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/looks/draft/[id]',
    params: { id: 'new', pick: '1' },
  });
  await fireEvent.press(screen.getByRole('tab', { name: `${lookbook.tabs.suggested} 1` }));
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.suggestedTile.menu.save }),
  );
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/save'))).toBe(true),
  );
  expect(await screen.findByText(lookbook.savedSuggestion.title)).toBeTruthy();
  expect(screen.getByText(lookbook.savedSuggestion.body(1))).toBeTruthy();
});

// Annie, P2 15 Nov: Suggested is what Robes brings, so neither the + nor the empty state offers
// New look there; Robes will fill blank days with suggested looks (still to be designed).
test('nothing suggested says so in one line, with Go to Saved and no New look or + on Suggested', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({}),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  mockParams.tab = 'suggested';
  await renderWithApi(<LooksView />);
  expect(await screen.findByText(lookbook.suggestedEmpty.title)).toBeTruthy();
  // The tab in view counts even its nothing (design "Suggested looks" 08).
  expect(screen.getByRole('tab', { name: `${lookbook.tabs.suggested} 0` })).toBeTruthy();
  expect(screen.queryByRole('button', { name: `+ ${lookbook.newLook}` })).toBeNull();
  expect(screen.queryByRole('button', { name: lookbook.newLook })).toBeNull();
  expect(screen.queryByTestId('draft-prompt')).toBeNull();
  // Go to Saved, and the + is there again.
  await fireEvent.press(screen.getByRole('button', { name: lookbook.suggestedEmpty.action }));
  expect(await screen.findByRole('button', { name: lookbook.newLook })).toBeTruthy();
  delete mockParams.tab;
});

test('once today is logged, the diary sheet carries no second "worn today" line', async () => {
  const worn = look({ lastWornOn: localDate(), timesWorn: 1 });
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: worn,
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': { days: [] },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.savedLook.schedule }));
  expect(await screen.findByText(lookbook.diary.eyebrow)).toBeTruthy();
  // It read like a bug, two checks in a row (27 Oct).
  expect(screen.queryByRole('button', { name: 'I wore this today' })).toBeNull();
  expect(screen.queryByText(/Worn today/)).toBeNull();
});

test('a saved look on a Robes model carries no tag on its picture (D10: the ModelStack on Home is the door)', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({ onRobesModel: true, frame: true }),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': { days: [] },
    'GET /looks': { items: [], nextCursor: null },
    'GET /me/model': GENERIC_MODEL,
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  expect(await screen.findByTestId('saved-look-back')).toBeTruthy();
  expect(screen.queryByRole('button', { name: lookbook.deck.robesModelLabel })).toBeNull();
});
