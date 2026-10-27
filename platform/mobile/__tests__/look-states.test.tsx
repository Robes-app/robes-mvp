import type { Look, LookSet } from '@robes/contracts';
import { lookbook, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NewLookBox } from '../src/features/home/HomeBox';
import { Deck, JobDeck } from '../src/features/looks/Deck';
import { LookScreen } from '../src/features/looks/LookScreen';
import { LooksView } from '../src/features/looks/LooksView';
import { localDate } from '../src/features/looks/saved-looks';
import { dayLabel } from '../src/features/plan/plan';
import { errorReply, ME, mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { Providers } from './support/providers';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

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

test('the Lookbook: Saved leads with drafts in progress; Suggested tiles go with Undo', async () => {
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
  expect(screen.getByText('1 look · 1 in progress')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: `Draft: ${lookbook.draftTile.untitled}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${SECOND}`);

  await fireEvent.press(screen.getByRole('radio', { name: lookbook.tabs.suggested }));
  expect(await screen.findByText('Garden party')).toBeTruthy();
  expect(screen.getByText(lookbook.suggestedTile.around('camel wool coat'))).toBeTruthy();
  expect(screen.queryByText('Weekend navy')).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.suggestedTile.remove('Garden party') }),
  );
  expect(await screen.findByText(lookbook.removed)).toBeTruthy();
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

test('an empty Suggested tab offers the prompt; her words go with the day they name', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({}),
    'GET /wardrobe/items': { items: [], nextCursor: null },
    'POST /looks/prompt': { jobId: JOB_ID, status: 'queued' },
  });
  await renderWithApi(<NewLookBox />);
  await fireEvent.changeText(
    screen.getByLabelText(lookbook.prompt.doorNew),
    'Dinner tomorrow, chic',
  );
  await fireEvent.press(screen.getByRole('button', { name: lookbook.prompt.send }));
  await waitFor(() =>
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/looks/job/[jobId]',
      params: { jobId: JOB_ID },
    }),
  );
  const today = localDate();
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = localDate(new Date(y ?? 0, (m ?? 1) - 1, (d ?? 1) + 1));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    prompt: 'Dinner tomorrow, chic',
    date: tomorrow,
  });
});

test('every new-look door asks where the pieces come from once she has filed any', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'POST /looks/prompt': { jobId: JOB_ID, status: 'queued' },
  });
  await renderWithApi(<NewLookBox />);
  await waitFor(() => expect(calls.some((c) => c.path.includes('/wardrobe/items'))).toBe(true));
  await fireEvent.changeText(screen.getByLabelText(lookbook.prompt.doorNew), 'Gallery opening');
  await fireEvent.press(screen.getByRole('button', { name: lookbook.prompt.send }));
  expect(await screen.findByText(lookbook.prompt.balance.question)).toBeTruthy();
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
  await fireEvent.press(screen.getByTestId('balance-mix'));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      prompt: 'Gallery opening',
      balance: 'mix',
    }),
  );
});

test('a suggested look reads as Robes composed it; Save to lookbook opens the diary', async () => {
  let saved = false;
  const [y, m, d] = localDate().split('-').map(Number);
  const tomorrow = localDate(new Date(y ?? 0, (m ?? 1) - 1, (d ?? 1) + 1));
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: () =>
      saved ? suggestion({ status: 'saved' }) : suggestion({ dateHint: tomorrow }),
    [`POST /looks/${LOOK_ID}/save`]: () => {
      saved = true;
      return suggestion({ status: 'saved', dateHint: tomorrow });
    },
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
    'GET /looks': byStatus({}),
    'GET /looks/sets/:id': {},
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  expect(await screen.findByText(lookbook.eyebrow.suggestedAround('camel wool coat'))).toBeTruthy();
  // The note is three sentences at most; the rack reads like the wardrobe.
  expect(screen.getByText('A long lunch in the sun. The jacket open. Easy.')).toBeTruthy();
  expect(screen.getByText('Shoes · Toteme')).toBeTruthy();
  expect(screen.getByText('Exclamation · Not yours yet · toteme.com · €390')).toBeTruthy();
  expect(screen.getByText(lookbook.composedByRobes)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.bar.saveToLookbook }));
  // The diary opens every time as beta's month, the day her words named already picked.
  expect(await screen.findByText(lookbook.diary.eyebrow)).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/save'))?.body).toEqual({});
  await fireEvent.press(screen.getByRole('button', { name: lookbook.diary.put }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/days'))?.body).toEqual({
      dates: [tomorrow],
      slot: 'day',
    }),
  );
  expect(
    await screen.findByText(lookbook.diary.inDiaryFor('Garden party', dayLabel(tomorrow))),
  ).toBeTruthy();
});

test('closing the diary after Save is not yet: nothing is pinned', async () => {
  let saved = false;
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: () => (saved ? suggestion({ status: 'saved' }) : suggestion()),
    [`POST /looks/${LOOK_ID}/save`]: () => {
      saved = true;
      return suggestion({ status: 'saved' });
    },
    'GET /looks': byStatus({}),
    'GET /looks/sets/:id': {},
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.bar.saveToLookbook }));
  expect(await screen.findByText(lookbook.diary.eyebrow)).toBeTruthy();
  // Today is already picked, so the CTA is live — beta never opens this sheet inert.
  expect(screen.getByRole('button', { name: lookbook.diary.put })).not.toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.diary.notYet }));
  await waitFor(() => expect(screen.queryByText(lookbook.diary.eyebrow)).toBeNull());
  expect(calls.some((c) => c.path.endsWith('/days'))).toBe(false);
});

test('↻ on a suggested look swaps in one tap, stays suggested, and Undo puts it back', async () => {
  const COAT = '99999999-9999-4999-8999-999999999999';
  const coat = piece({ id: COAT, label: 'Navy wool coat' });
  const shown = suggestion({ pieces: [{ piece: piece(), slot: null, role: 'anchor' }] });
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: shown,
    [`PATCH /looks/${LOOK_ID}`]: shown,
    'GET /wardrobe/items': { items: [piece(), coat], nextCursor: null },
    'GET /looks': byStatus({}),
    'GET /looks/sets/:id': {},
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.rack.swap('Camel wool coat') }),
  );
  await fireEvent.press(await screen.findByRole('radio', { name: 'Navy wool coat' }));
  const patches = () => calls.filter((c) => c.method === 'PATCH');
  await waitFor(() => expect(patches()).toHaveLength(1));
  expect(patches()[0]?.body).toMatchObject({ keepSuggested: true });
  expect(JSON.stringify(patches()[0]?.body)).toContain(COAT);
  await fireEvent.press(await screen.findByRole('button', { name: ui.undo }));
  await waitFor(() => expect(patches()).toHaveLength(2));
  expect(patches()[1]?.body).toMatchObject({ keepSuggested: true });
  expect(JSON.stringify(patches()[1]?.body)).not.toContain(COAT);
  // Still a suggestion: Save to lookbook, never a draft's Save.
  expect(screen.getByRole('button', { name: lookbook.bar.saveToLookbook })).toBeTruthy();
});

test('the Generic model badge opens the twin drawer, and only its CTA navigates', async () => {
  mockFetch({
    'GET /me/model': GENERIC_MODEL,
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: suggestion(),
    'GET /looks': byStatus({}),
    'GET /looks/sets/:id': {},
    'GET /plan': { from: localDate(), to: localDate(), days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.deck.genericModelLabel }),
  );
  expect(await screen.findByText(lookbook.deck.twin.body)).toBeTruthy();
  // Keeping the generic model closes it and changes nothing.
  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.twin.keep }));
  expect(mockRouter.push).not.toHaveBeenCalled();

  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.deck.genericModelLabel }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.deck.twin.upload }));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/model');
});

test('the look prompt lands a swap on a draft and remembers what it replaced', async () => {
  const draft = look({
    status: 'draft',
    pieces: [{ piece: piece(), slot: null, role: 'anchor' }],
    proposals: [mules],
  });
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: draft,
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
    'GET /looks': byStatus({}),
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // A hand-built draft opens in the composer: the ✦ above Discard · Save opens the prompt.
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.figure.prompt }));
  const field = await screen.findByLabelText(lookbook.prompt.doorDraft);
  await fireEvent.changeText(field, 'swap the mules for my dark jean');
  await fireEvent.press(screen.getByRole('button', { name: lookbook.prompt.send }));
  expect(await screen.findByText('Done. The dark jean is on the look now.')).toBeTruthy();
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
  expect(screen.getByText(lookbook.rack.swappedIn('the black pointed mules'))).toBeTruthy();
});

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
  // A hand-built draft opens in the composer: the ✦ above Discard · Save opens the prompt.
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.figure.prompt }));
  const field = await screen.findByLabelText(lookbook.prompt.doorDraft);
  await fireEvent.changeText(field, 'never grey');
  await fireEvent.press(screen.getByRole('button', { name: lookbook.prompt.send }));
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
    looks: [suggestion()],
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

  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.genericModelLabel }));
  expect(await screen.findByText(lookbook.deck.twin.body)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.deck.twin.keep }));
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
  expect(mockRouter.back).toHaveBeenCalled();
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

test('editing a suggestion at five drafts asks, then lets the oldest go', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let patches = 0;
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: suggestion(),
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => {
      patches += 1;
      return patches === 1
        ? errorReply(409, 'conflict', { reason: 'drafts_full' })
        : { ...suggestion(), status: 'draft', ...JSON.parse(String(init.body)), proposals: [] };
    },
    'GET /looks': byStatus({ draft: [look({ name: 'Oldest draft', status: 'draft' })] }),
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.bar.edit }));
  await waitFor(() => expect(alert).toHaveBeenCalled());
  const [title, body, buttons] = alert.mock.calls[0] as [
    string,
    string,
    { text: string; onPress?: () => void }[],
  ];
  expect([title, body]).toEqual([
    lookbook.drafts.fullTitle,
    lookbook.drafts.fullBody('Oldest draft'),
  ]);
  await act(async () => buttons.find((b) => b.text === lookbook.drafts.letGo)?.onPress?.());
  await waitFor(() => expect(patches).toBe(2));
  const sent = calls
    .filter((c) => c.method === 'PATCH')
    .map((c) => c.body as Record<string, unknown>);
  expect(sent[0]?.letGoOldest).toBeUndefined();
  expect(sent[1]?.letGoOldest).toBe(true);
});

test('the Lookbook opens on the looks worn last; a draft reads as started; suggestions say where they came from', async () => {
  const id = (n: number) => `dddddddd-dddd-4ddd-8ddd-00000000000${n}`;
  mockFetch({
    'GET /me': ME,
    'GET /looks': byStatus({
      saved: [
        look({ id: id(1), name: 'Never worn', timesWorn: 0, lastWornOn: null }),
        look({ id: id(2), name: 'Worn in August', lastWornOn: '2026-08-02' }),
        look({ id: id(3), name: 'Worn last', lastWornOn: '2026-10-20' }),
        look({ id: id(4), name: 'Worn in September', lastWornOn: '2026-09-12' }),
      ],
      draft: [look({ id: SECOND, status: 'draft', name: 'Minion Day' })],
      suggested: [suggestion(), suggestion({ id: JEAN, name: 'Gallery night', anchor: null })],
    }),
  });
  await renderWithApi(<LooksView />);
  await screen.findByText('Worn last');
  expect(
    screen.getByRole('button', { name: `${lookbook.sort.label}: ${lookbook.sort.lastWorn}` }),
  ).toBeTruthy();
  const order = ['Worn last', 'Worn in September', 'Worn in August', 'Never worn'].map(
    (name) => screen.getByText(name).props.children,
  );
  expect(screen.getAllByText(/^(Worn|Never)/).map((t) => t.props.children)).toEqual(order);
  expect(screen.getByText(/^Started /)).toBeTruthy();

  await fireEvent.press(screen.getByRole('radio', { name: lookbook.tabs.suggested }));
  await screen.findByText('Gallery night');
  // Styled from her words: the rose open-quote. Styled around a piece: the piece, which opens.
  expect(
    screen.getByTestId(`suggested-${JEAN}-quote`, { includeHiddenElements: true }),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.suggestedTile.yourPiece('camel wool coat') }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith(`/piece/${PIECE_ID}`);
});
