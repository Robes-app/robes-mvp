import type { Look, LookSet } from '@robes/contracts';
import { lookbook, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Deck } from '../src/features/looks/Deck';
import { LookScreen } from '../src/features/looks/LookScreen';
import { LooksView } from '../src/features/looks/LooksView';
import { NewLookBox } from '../src/features/looks/NewLookBox';
import { localDate } from '../src/features/looks/saved-looks';
import { ME, mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

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
    'POST /looks/prompt': { jobId: JOB_ID, status: 'queued' },
  });
  await renderWithApi(<NewLookBox />);
  await fireEvent.changeText(
    screen.getByLabelText(lookbook.prompt.doorNew),
    'Dinner tomorrow, chic',
  );
  await fireEvent.press(screen.getByRole('button', { name: lookbook.prompt.send }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(`/looks/job/${JOB_ID}`));
  const today = localDate();
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = localDate(new Date(y ?? 0, (m ?? 1) - 1, (d ?? 1) + 1));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    prompt: 'Dinner tomorrow, chic',
    date: tomorrow,
  });
});

test('a suggested look reads as Robes composed it; Save to lookbook keeps it as is', async () => {
  let saved = false;
  const calls = mockFetch({
    'GET /me': ME,
    [`GET /looks/${LOOK_ID}`]: () =>
      saved ? suggestion({ status: 'saved' }) : suggestion({ dateHint: '2026-10-17' }),
    [`POST /looks/${LOOK_ID}/save`]: () => {
      saved = true;
      return suggestion({ status: 'saved', dateHint: '2026-10-17' });
    },
    'GET /looks': byStatus({}),
    'GET /looks/sets/:id': {},
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  expect(await screen.findByText(lookbook.eyebrow.suggestedAround('camel wool coat'))).toBeTruthy();
  // The note is three sentences at most; the rack reads like the wardrobe.
  expect(screen.getByText('A long lunch in the sun. The jacket open. Easy.')).toBeTruthy();
  expect(screen.getByText('Shoes · Toteme')).toBeTruthy();
  expect(screen.getByText('Exclamation · Not yours yet · toteme.com · €390')).toBeTruthy();
  expect(screen.getByText(lookbook.composedByRobes)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.bar.saveToLookbook }));
  expect(await screen.findByText(lookbook.saved)).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.savedFor('Sat 17 Oct') })).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/save'))?.body).toEqual({});
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
