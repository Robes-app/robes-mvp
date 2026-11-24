import type { Look } from '@robes/contracts';
import { lookbook, looks } from '@robes/copy';
import { longDate, monthOf, shiftMonth } from '@robes/core/calendar';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { LookScreen } from '../src/features/looks/LookScreen';
import { localDate, nextDays } from '../src/features/looks/saved-looks';
import { nativeAnalytics } from '../src/lib/analytics';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { drawnOnAsk } from './support/drawn';
import { LOOK_ID, look, modelData, PIECE_ID, piece } from './support/fixtures';
import { openAnswer, openPrompt } from './support/prompt';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const _TOKEN = 'AbCdEfGhIjKlMnOpQrStUv';

beforeEach(() => jest.clearAllMocks());
// Call sites report through the consent-gated client (observability.test.ts proves the gate).
const track = jest.spyOn(nativeAnalytics, 'track');

// The name is the Caption in Details (D16): nothing stands between the photo and the tabs.
test('a suggested name is renamed in Details › Caption, never a "Keep this name" line', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({ nameProvisional: true, name: 'Camel coat, styled' }),
    [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) =>
      look({ name: JSON.parse(String(init.body)).name, nameProvisional: false }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('tab', { name: lookbook.savedLook.tabs.details }));
  expect(await screen.findByText('Camel coat, styled')).toBeTruthy();
  // No title, no pencil, no facts line, no suggestion line, no eyebrow over the picture.
  expect(screen.queryByRole('button', { name: looks.page.rename })).toBeNull();
  expect(screen.queryByText(/pinned for/)).toBeNull();
  expect(screen.queryByText('Robes’ suggestion')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Keep this name' })).toBeNull();

  // The caption row becomes the field: no label, no Save name, no Cancel.
  await fireEvent.press(screen.getByTestId('details-caption'));
  const field = screen.getByLabelText(lookbook.savedLook.details.caption);
  expect(field.props.value).toBe('Camel coat, styled');
  expect(screen.queryByText('Save name')).toBeNull();
  expect(screen.queryByText('Cancel')).toBeNull();
  await fireEvent.changeText(field, 'Gallery opening');
  await fireEvent(field, 'submitEditing');
  expect(await screen.findByText('Gallery opening')).toBeTruthy();
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ name: 'Gallery opening' });
});

test('an emptied caption is refused: the look keeps its name and nothing is sent', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({ name: 'Gallery opening' }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('tab', { name: lookbook.savedLook.tabs.details }));
  await fireEvent.press(await screen.findByTestId('details-caption'));
  const field = screen.getByLabelText(lookbook.savedLook.details.caption);
  await fireEvent.changeText(field, '  ');
  await fireEvent(field, 'blur');
  expect(await screen.findByText('Gallery opening')).toBeTruthy();
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
});

test('the diary on the picture opens the one diary drawer and pins the chosen local date', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': { days: [] },
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.savedLook.schedule }));
  const [, tomorrow] = nextDays(2);
  await fireEvent.press(await screen.findByLabelText(longDate(tomorrow ?? '')));
  await fireEvent.press(screen.getByRole('button', { name: lookbook.diary.put }));
  const pin = (globalThis.fetch as jest.Mock).mock.calls.find(([url]) =>
    String(url).includes('/plan/looks/'),
  );
  expect(JSON.parse(String(pin?.[1]?.body))).toEqual({ dates: [tomorrow], slot: 'day' });
  await waitFor(() => expect(track).toHaveBeenCalledWith('look_pinned', { offset_from_today: 1 }));
});

test('a day already carrying the look opens that day from the drawer (L7)', async () => {
  const [, tomorrow = ''] = nextDays(2);
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': {
      from: tomorrow,
      to: tomorrow,
      days: [
        {
          date: tomorrow,
          name: null,
          entries: [
            {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              date: tomorrow,
              slot: 'day',
              activity: null,
              look: look(),
            },
          ],
        },
      ],
    },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.savedLook.schedule }));
  await fireEvent.press(await screen.findByLabelText(longDate(tomorrow)));
  await act(async () => {
    await fireEvent.press(await screen.findByRole('button', { name: lookbook.diary.already }));
  });
  expect(mockRouter.push).toHaveBeenCalledWith(`/day/${tomorrow}`);
});

test('every wear on the look marks its day, not only the last (L9)', async () => {
  const earlier = `${shiftMonth(monthOf(localDate()), -1)}-15`;
  mockFetch({
    // The look's last wear is today; the record also holds a day last month.
    [`GET /looks/${LOOK_ID}`]: look({ lastWornOn: localDate(), timesWorn: 2 }),
    [`GET /looks/${LOOK_ID}/wears`]: {
      items: [
        { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', wornOn: localDate(), pieces: [] },
        { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', wornOn: earlier, pieces: [] },
      ],
    },
    'GET /plan': { days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.savedLook.schedule }));
  await fireEvent.press(await screen.findByLabelText(lookbook.diary.prevMonth));
  await fireEvent.press(await screen.findByLabelText(longDate(earlier)));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: lookbook.diary.recorded })).toBeDisabled(),
  );
});

test('the record logs a day through the same drawer', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /plan': { days: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // Details › Worn, then "+ Add a date" (Felix WornView): the one drawer that logs a date.
  await fireEvent.press(await screen.findByRole('tab', { name: lookbook.savedLook.tabs.details }));
  await fireEvent.press(await screen.findByTestId('details-worn'));
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.savedLook.wornView.add }),
  );
  // The same drawer, named for the look — never a second way to log a date.
  expect(await screen.findByLabelText(lookbook.diary.prevMonth)).toBeTruthy();
});

test('a re-draw that failed says so on the picture, and Try again asks once more', async () => {
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({ onModel: 'failed' }),
    'GET /looks': { items: [], nextCursor: null },
    'GET /me/model': {
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
      stand: { imageUrl: 'https://m.test/w-s4-h1-nt.png', generic: true },
    },
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'queued',
    },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.figure.undressed('her') }),
  );
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/render'))).toBe(true),
  );
});

test('a look carries no share door, and no save-as-new (27 Oct)', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  expect(await screen.findByRole('button', { name: lookbook.savedLook.schedule })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save as new' })).toBeNull();
});

test('the saved look says the day it is pinned for, each piece its wears, each wear its weekday', async () => {
  const [, tomorrow] = nextDays(2);
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look({
      pieces: [{ piece: piece({ wearCount: 4 }), slot: null, role: null }],
      pinnedOn: ['2020-01-01', tomorrow ?? ''],
    }),
    [`GET /looks/${LOOK_ID}/wears`]: {
      items: [{ id: LOOK_ID, wornOn: '2026-09-08', pieces: [{ id: PIECE_ID, label: null }] }],
    },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // No facts line under the photo (D16): the wears live behind Details › Worn (Felix 3e), each
  // with its weekday.
  await fireEvent.press(await screen.findByRole('tab', { name: lookbook.savedLook.tabs.details }));
  expect(screen.queryByText(/pinned for/)).toBeNull();
  await fireEvent.press(await screen.findByTestId('details-worn'));
  expect(await screen.findByText('Tue 8 Sep')).toBeTruthy();
});

// Felix 3e (D17): a saved look edits in place. Its changes wait for Update look; leaving with any
// asks first.
const JEANS = '99999999-9999-4999-8999-999999999999';
const ASK_JOB = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const twoPieces = () =>
  look({
    pieces: [
      { piece: piece(), slot: null, role: null },
      {
        piece: piece({ id: JEANS, label: 'Straight jeans', category: 'Bottoms' }),
        slot: null,
        role: null,
      },
    ],
    // Already on her model, so opening it draws nothing; only Update look does.
    model: piece().image,
    onModel: 'ready',
  });
const editRoutes = (mine: Look) => ({
  [`GET /looks/${LOOK_ID}`]: mine,
  [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
  'GET /looks': { items: [], nextCursor: null },
  'GET /me/model': modelData({
    stand: { imageUrl: 'https://media.test/generic.webp', generic: true },
  }),
  [`PATCH /looks/${LOOK_ID}`]: (init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { pieces: { pieceId: string }[] };
    return {
      ...mine,
      pieces: mine.pieces.filter((p) => body.pieces.some((b) => b.pieceId === p.piece.id)),
      updatedAt: new Date().toISOString(),
    };
  },
  [`POST /looks/${LOOK_ID}/render`]: { jobId: ASK_JOB, status: 'queued' },
});

test('3e edits in place: no Edit chip, the pencil reveals swap and ×, and no styling control on the photo', async () => {
  mockFetch(editRoutes(twoPieces()));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // At rest a row opens its piece (PRD §6.1, plan R2); the pencil shows the swap and ×.
  // The rack's controls sit on the Pieces · Details line (Annie, 16 Nov); each row's wears behind a
  // calendar, and the small + hanger chip under the list.
  expect(await screen.findByTestId('rack-pencil')).toBeTruthy();
  expect(within(screen.getByTestId('draft-tabs')).getByTestId('rack-pencil')).toBeTruthy();
  expect(screen.getAllByLabelText(/^\d+ wears?$/)).toHaveLength(2);
  expect(screen.getByTestId('rack-add')).toBeTruthy();
  expect(screen.queryByRole('button', { name: lookbook.rack.swap('Camel wool coat') })).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.open('Camel wool coat') }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/piece/[id]',
    params: { id: PIECE_ID },
  });
  mockRouter.push.mockClear();
  await fireEvent.press(screen.getByTestId('rack-pencil'));
  expect(screen.getByTestId('rack-pencil').props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('button', { name: lookbook.rack.swap('Camel wool coat') })).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.rack.remove('Straight jeans') })).toBeTruthy();
  // Robes MVP 2b (Annie, 15 Nov): in edit mode the wears step aside (swap and the chevron only) and
  // × sits on each card's top-left corner.
  expect(screen.queryAllByLabelText(/^\d+ wears?$/)).toHaveLength(0);
  expect(screen.getAllByTestId(/^rack-remove-/)).toHaveLength(2);
  expect(screen.queryByRole('button', { name: lookbook.savedLook.edit })).toBeNull();
  // No header: the back disc rides the photo, Schedule look holds the foot.
  expect(screen.queryByTestId('draft-close')).toBeNull();
  expect(screen.getByTestId('saved-look-back')).toBeTruthy();
  expect(screen.getByTestId('schedule-look')).toBeTruthy();
  // The sparkle stands beside Schedule look in the foot's one row (design 2c, Annie 18 Nov).
  const foot = within(screen.getByTestId('look-bar'));
  expect(foot.getByTestId('schedule-look')).toBeTruthy();
  expect(foot.getByTestId('prompt-spark')).toBeTruthy();
  // A saved look rests as the sparkle (docked prompt K2). Tapped, it is the bar, its field line
  // reading "add matching shoes…", and the look's button steps away (pins 23, 25).
  expect(screen.queryByTestId('draft-prompt')).toBeNull();
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  expect(screen.getByTestId('prompt-bar')).toBeTruthy();
  expect(nativeAnalytics.track).toHaveBeenCalledWith('dock_state_changed', {
    from: 'spark',
    to: 'bar',
    context: 'saved',
  });
  expect(screen.getByLabelText(lookbook.draftLook.savedPlaceholder)).toBeTruthy();
  expect(screen.queryByTestId('update-model')).toBeNull();
  expect(screen.queryByTestId('update-look')).toBeNull();
  expect(screen.queryByTestId('schedule-look')).toBeNull();
  // An empty send on the bar folds it to the sparkle, and Schedule look is back (K6).
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(await screen.findByTestId('prompt-spark')).toBeTruthy();
  // The field line opens the sheet with its title, over the dimmed look; its close puts the
  // prompt away, to the sparkle (Annie, 18 Nov).
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  await fireEvent.press(screen.getByTestId('prompt-rest'));
  expect(screen.getByText(lookbook.draftLook.dock.title)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-minimise'));
  await waitFor(() => expect(screen.queryByTestId('draft-prompt')).toBeNull());
  expect(screen.getByTestId('prompt-spark')).toBeTruthy();
  expect(screen.getByTestId('schedule-look')).toBeTruthy();
  // No styling control on the photo (docked prompt PRD M1): the prompt is the one way to ask.
  expect(screen.queryByTestId('draft-adjust')).toBeNull();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('a change turns the foot to Update look: back asks Discard your changes?, Update applies it in place', async () => {
  const calls = mockFetch(editRoutes(twoPieces()));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('rack-pencil'));
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.remove('Straight jeans') }),
  );
  // One button at the foot (PRD §6.1): Update look takes Schedule look's place while it waits.
  expect(screen.getByTestId('update-look')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: lookbook.draftLook.update })).toHaveLength(1);
  expect(screen.queryByTestId('schedule-look')).toBeNull();
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  // Leaving with the change unapplied asks first; Keep editing stays.
  await fireEvent.press(screen.getByTestId('saved-look-back'));
  expect(await screen.findByText(lookbook.draftLook.discardEdit.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.draftLook.discard.keep }));
  expect(mockRouter.back).not.toHaveBeenCalled();
  // Update writes the rack, then draws the picture for it; she stays on the look.
  await fireEvent.press(screen.getByTestId('update-look'));
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/render'))).toBe(true),
  );
  const patch = calls.find((c) => c.method === 'PATCH')?.body as { pieces: unknown[] };
  expect(patch.pieces).toEqual([{ pieceId: PIECE_ID, role: null }]);
  expect(calls.findIndex((c) => c.method === 'PATCH')).toBeLessThan(
    calls.findIndex((c) => c.method === 'POST' && c.path.endsWith('/render')),
  );
  expect(await screen.findByText(lookbook.updated)).toBeTruthy();
  await waitFor(() => expect(screen.queryByTestId('update-look')).toBeNull());
  expect(screen.getByTestId('schedule-look')).toBeTruthy();
  expect(mockRouter.back).not.toHaveBeenCalled();
  // Nothing waits now: back leaves without a question.
  await fireEvent.press(screen.getByTestId('saved-look-back'));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

test('Discard drops the unapplied change and leaves; nothing is written', async () => {
  const calls = mockFetch(editRoutes(twoPieces()));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('rack-pencil'));
  await fireEvent.press(
    screen.getByRole('button', { name: lookbook.rack.remove('Straight jeans') }),
  );
  await fireEvent.press(screen.getByTestId('saved-look-back'));
  await fireEvent.press(
    await screen.findByRole('button', { name: lookbook.draftLook.discard.discard }),
  );
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  // The rack stands as it was saved.
  expect(screen.getByRole('button', { name: lookbook.rack.remove('Straight jeans') })).toBeTruthy();
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
});

test('words sent from a saved look’s prompt are answered on the rack and kept, with no Update look', async () => {
  const drawn = drawnOnAsk(twoPieces(), ASK_JOB);
  const calls = mockFetch({
    ...editRoutes(twoPieces()),
    [`GET /looks/${LOOK_ID}`]: drawn.get,
    [`POST /looks/${LOOK_ID}/render`]: drawn.render,
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
    [`GET /jobs/${ASK_JOB}`]: {
      id: ASK_JOB,
      kind: 'look_ask',
      status: 'succeeded',
      stage: 'done',
      output: {
        ask: {
          intent: 'styled',
          reply: 'Collar up.',
          swaps: [],
          back: [],
          backAll: false,
          styled: [{ key: PIECE_ID, note: 'collar up' }],
          draft: '',
          rule: '',
          noticed: false,
        },
      },
      error: null,
      cancelRequested: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      finishedAt: '2026-10-15T10:00:01.000Z',
    },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await openPrompt(), 'collar up on the coat');
  // Typed words raise no button (redline 14 Nov, pin 25): the prompt's own send is the way.
  expect(screen.queryByTestId('update-look')).toBeNull();
  expect(calls.some((c) => c.path.endsWith('/ask'))).toBe(false);
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/ask'))?.body).toMatchObject({
      text: 'collar up on the coat',
      surface: 'saved',
    }),
  );
  // The write follows the answer onto the rack with no button pressed, and Robes does not say
  // what it did: the change is seen, and it only asks.
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(screen.queryByText('Collar up.')).toBeNull();
  // While the model wears it the dock waits as the sparkle (Annie, 18 Nov): no thumbs yet. Once
  // the picture lands the question comes on the sparkle's dot, and a tap opens it, with its thumbs.
  expect(await screen.findByTestId('prompt-spark')).toBeTruthy();
  expect(screen.queryByTestId('thumb-up')).toBeNull();
  expect(screen.queryByTestId('update-look')).toBeNull();
  expect(
    await screen.findByTestId(
      'prompt-spark-dot',
      { includeHiddenElements: true },
      { timeout: 8000 },
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  expect(await screen.findByTestId('thumb-up')).toBeTruthy();
  await openPrompt();
  expect(screen.getByText(lookbook.draftLook.feedback.closer)).toBeTruthy();
  expect(calls.findIndex((c) => c.path.endsWith('/ask'))).toBeLessThan(
    calls.findIndex((c) => c.method === 'PATCH'),
  );
  const patch = calls.find((c) => c.method === 'PATCH')?.body as { styling: unknown };
  expect(patch.styling).toEqual({ [PIECE_ID]: 'collar up' });
}, 20_000);

// The feedback thread on a saved look (look prompt PRD F3, F11, F13–F15, F22): the box's send
// asks, Robes asks about the change it made, and what she taps next rides the following send.
// What Robes changes is kept as it lands (redline 14 Nov, pin 25): no Update look.
test('a saved look: the send asks, Robes asks about the change, reasons ride the next send', async () => {
  const styled = {
    intent: 'styled',
    reply: 'Collar up.',
    swaps: [],
    back: [],
    backAll: false,
    styled: [{ key: PIECE_ID, note: 'collar up' }],
    draft: '',
    rule: '',
    noticed: false,
    followUp: 'How does the collar look?',
  };
  const calls = mockFetch({
    ...editRoutes(twoPieces()),
    // The picture's drawing is not this test's subject, and a send waits for a picture being
    // drawn: its request is refused here, so the prompt is free again at once.
    [`POST /looks/${LOOK_ID}/render`]: errorReply(503, 'unavailable'),
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
    [`GET /jobs/${ASK_JOB}`]: {
      id: ASK_JOB,
      kind: 'look_ask',
      status: 'succeeded',
      stage: 'done',
      output: { ask: styled },
      error: null,
      cancelRequested: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      finishedAt: '2026-10-15T10:00:01.000Z',
    },
  });
  const fb = lookbook.draftLook.feedback;
  const asks = () => calls.filter((c) => c.path.endsWith('/ask'));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await openPrompt(), 'collar up on the coat');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  // Robes' own question about the change it made (F3; kept over the fixed list, Annie 18 Nov).
  await openAnswer();
  expect(await screen.findByText('How does the collar look?')).toBeTruthy();
  expect(asks()).toHaveLength(1);
  // The change is kept as it lands, with no button and no line saying so.
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(screen.queryByTestId('update-look')).toBeNull();
  expect(screen.queryByText('Collar up.')).toBeNull();
  // Opened from the sparkle, the bar holds the question and its thumbs, the look above it.
  expect(screen.queryByTestId('prompt-pill')).toBeNull();
  expect(screen.getByText('How does the collar look?')).toBeTruthy();
  expect(screen.getByTestId('thumb-up')).toBeTruthy();
  // A thumbs down on the bar opens the sheet on what to change.
  await fireEvent.press(screen.getByTestId('thumb-down'));
  expect(await openPrompt()).toBeTruthy();
  expect(screen.getByText(fb.change)).toBeTruthy();
  // A saved look carries no weather and is never restyled whole (F13, F14).
  expect(screen.queryByTestId('reason-weather')).toBeNull();
  expect(screen.queryByTestId('reason-restyle')).toBeNull();
  // "A piece I don't like" asks which piece first and sends nothing (docked prompt Q6): one
  // chip per piece, its photograph labelled with its name. The piece she taps stands in the box
  // as "Not the {piece}"; a tap on it takes it out again.
  await fireEvent.press(screen.getByTestId('reason-piece'));
  expect(await screen.findByText(fb.whichPiece)).toBeTruthy();
  expect(asks()).toHaveLength(1);
  const pieces = screen.getAllByTestId(/^which-piece-/);
  expect(pieces.length).toBeGreaterThan(0);
  await fireEvent.press(pieces[0] as NonNullable<(typeof pieces)[0]>);
  expect(screen.queryByText(fb.whichPiece)).toBeNull();
  expect(screen.getByTestId('reason-piece')).toHaveTextContent(/^Not the /);
  await fireEvent.press(screen.getByTestId('reason-piece'));
  expect(screen.queryByTestId('which-piece')).toBeNull();
  // Up to three reasons: with three picked no more are offered.
  await fireEvent.press(screen.getByTestId('reason-dressy'));
  await fireEvent.press(screen.getByTestId('reason-colours'));
  await fireEvent.press(screen.getByTestId('reason-fit'));
  expect(screen.queryByTestId('reason-casual')).toBeNull();
  await fireEvent.press(screen.getByTestId('reason-fit'));
  expect(screen.getByTestId('reason-casual')).toBeTruthy();
  // Two reasons and no words: the send carries them (F10, F11).
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() => expect(asks()).toHaveLength(2));
  expect(asks()[1]?.body).toMatchObject({
    surface: 'saved',
    text: '',
    reasons: ['dressy', 'colours'],
  });
  // The send puts the dock away while Robes works (Annie, 18 Nov); opened again, her choice is one
  // bubble in the thread (F17).
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.press(await screen.findByTestId('prompt-expand'));
  expect(
    await screen.findByText(`${fb.reasons.dressy.label} · ${fb.reasons.colours.label}`),
  ).toBeTruthy();
  expect(screen.queryByTestId('update-look')).toBeNull();
  expect(nativeAnalytics.track).toHaveBeenCalledWith('look_feedback_sent', {
    surface: 'saved',
    reason: 'several',
    has_text: false,
    action: 'adjust',
  });
});

// Testing 19 Nov: a change the picture already wore drew nothing, yet the thread waited two
// minutes for a picture before Robes asked. A draw that never starts asks at once.
test('a saved look: when nothing new is drawn, Robes asks straight away', async () => {
  const styled = {
    intent: 'styled',
    reply: '',
    swaps: [],
    back: [],
    backAll: false,
    styled: [{ key: PIECE_ID, note: 'worn open' }],
    draft: '',
    rule: '',
    noticed: false,
    followUp: 'Does the coat feel warm enough?',
  };
  const calls = mockFetch({
    ...editRoutes(twoPieces()),
    // The picture already wears this rack: the server hands back the draw that made it.
    [`POST /looks/${LOOK_ID}/render`]: { jobId: ASK_JOB, status: 'succeeded' },
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
    [`GET /jobs/${ASK_JOB}`]: {
      id: ASK_JOB,
      kind: 'look_ask',
      status: 'succeeded',
      stage: 'done',
      output: { ask: styled },
      error: null,
      cancelRequested: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      finishedAt: '2026-10-15T10:00:01.000Z',
    },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await openPrompt(), 'can you add a warm coat');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/render'))).toBe(true),
  );
  await openAnswer();
  expect(await screen.findByText('Does the coat feel warm enough?')).toBeTruthy();
}, 20_000);

// An answer that names a change none of which landed says so plainly (testing, 18 Nov: "Done. The
// scarf is on the look now." stood over a look with no scarf); no question follows, since nothing
// changed.
test('a change that never landed is said plainly, never claimed', async () => {
  const claimed = {
    intent: 'swap',
    reply: 'Done. The scarf is on the look now.',
    swaps: [],
    back: [],
    backAll: false,
    styled: [],
    draft: '',
    rule: '',
    noticed: false,
  };
  mockFetch({
    ...editRoutes(twoPieces()),
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
    [`GET /jobs/${ASK_JOB}`]: {
      id: ASK_JOB,
      kind: 'look_ask',
      status: 'succeeded',
      stage: 'done',
      output: { ask: claimed },
      error: null,
      cancelRequested: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      finishedAt: '2026-10-15T10:00:01.000Z',
    },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await openPrompt(), 'add a scarf');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await openAnswer();
  expect(await screen.findByText(lookbook.prompt.didNotLand)).toBeTruthy();
  expect(screen.queryByText('Done. The scarf is on the look now.')).toBeNull();
  expect(screen.queryByTestId('thumb-up')).toBeNull();
});

// Robes' question names what she asked (docked prompt PRD Q2–Q4): a single reason gets its own
// question, a piece from Which piece? "Better without the {piece}?", typed words "Closer?".
test('Robes asks about the reason or the piece she sent', async () => {
  const styled = {
    intent: 'styled',
    reply: '',
    swaps: [],
    back: [],
    backAll: false,
    styled: [{ key: PIECE_ID, note: 'collar up' }],
    draft: '',
    rule: '',
    noticed: false,
  };
  // Each ask is its own job, so each answer is new to the screen.
  const jobs = [1, 2, 3].map((n) => `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`);
  let sent = 0;
  const jobRoutes = Object.fromEntries(
    jobs.map((id) => [
      `GET /jobs/${id}`,
      {
        id,
        kind: 'look_ask',
        status: 'succeeded',
        stage: 'done',
        output: { ask: styled },
        error: null,
        cancelRequested: false,
        createdAt: '2026-10-15T10:00:00.000Z',
        updatedAt: '2026-10-15T10:00:00.000Z',
        finishedAt: '2026-10-15T10:00:01.000Z',
      },
    ]),
  );
  const calls = mockFetch({
    ...editRoutes(twoPieces()),
    [`POST /looks/${LOOK_ID}/render`]: errorReply(503, 'unavailable'),
    [`POST /looks/${LOOK_ID}/ask`]: () => {
      const jobId = jobs[Math.min(sent, jobs.length - 1)];
      sent += 1;
      return { jobId, status: 'queued' };
    },
    ...jobRoutes,
  });
  const fb = lookbook.draftLook.feedback;
  const asks = () => calls.filter((c) => c.path.endsWith('/ask'));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await openPrompt(), 'collar up on the coat');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  // Robes works with the dock put away; the question waiting, the sparkle carries its dot (K3).
  expect(
    await screen.findByTestId(
      'prompt-spark-dot',
      { includeHiddenElements: true },
      { timeout: 8000 },
    ),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', {
      name: `${lookbook.draftLook.dock.open}. ${lookbook.draftLook.dock.waiting}`,
    }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  expect(await screen.findByText(fb.closer)).toBeTruthy();
  // One reason: its own question. Back on the bar after the thumbs down (closed, then the
  // sparkle), the reasons stand there too (Annie, 18 Nov: folding the thread hid them), and the
  // bar's send carries the one she taps.
  await fireEvent.press(screen.getByTestId('thumb-down'));
  await fireEvent.press(screen.getByTestId('prompt-minimise'));
  await waitFor(() => expect(screen.queryByTestId('draft-prompt')).toBeNull());
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  expect(within(screen.getByTestId('prompt-bar')).getByTestId('feedback-reasons')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('reason-dressy'));
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() => expect(asks()).toHaveLength(2));
  // The rack already reads this way, so no picture follows: Robes asks once its wait is up.
  await openAnswer();
  expect(await screen.findByText(fb.askAfter.dressy, {}, { timeout: 8000 })).toBeTruthy();
  // A piece from Which piece?: "Better without the {piece}?".
  await fireEvent.press(screen.getByTestId('thumb-down'));
  await fireEvent.press(await screen.findByTestId('reason-piece'));
  await fireEvent.press(screen.getByTestId(`which-piece-${PIECE_ID}`));
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() => expect(asks()).toHaveLength(3));
  await openAnswer();
  expect(
    await screen.findByText(fb.withoutPiece('the camel wool coat'), {}, { timeout: 8000 }),
  ).toBeTruthy();
}, 30_000);

// A note about the whole picture goes through the prompt (docked prompt PRD M5, look-ask v5):
// the model is drawn again with her note and nothing on the rack changes; Robes asks "Closer?".
test('a note about the picture redraws the model with it and asks Closer?', async () => {
  const picture = {
    intent: 'picture',
    reply: '',
    swaps: [],
    back: [],
    backAll: false,
    styled: [],
    draft: '',
    rule: '',
    noticed: false,
    picture: 'a different pose, walking',
  };
  const calls = mockFetch({
    ...editRoutes(twoPieces()),
    // The draw is refused so the question is asked at once, without waiting for a picture.
    [`POST /looks/${LOOK_ID}/render`]: errorReply(503, 'unavailable'),
    [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
    [`GET /jobs/${ASK_JOB}`]: {
      id: ASK_JOB,
      kind: 'look_ask',
      status: 'succeeded',
      stage: 'done',
      output: { ask: picture },
      error: null,
      cancelRequested: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      finishedAt: '2026-10-15T10:00:01.000Z',
    },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await openPrompt(), 'a different pose, walking');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/render'))).toBe(true),
  );
  const render = calls.find((c) => c.method === 'POST' && c.path.endsWith('/render'));
  expect(render?.body).toEqual({ note: 'a different pose, walking' });
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  await openAnswer();
  expect(await screen.findByText(lookbook.draftLook.feedback.closer)).toBeTruthy();
});

// The sources on a saved look are the prompt's own setting (redline 14 Nov, pin 25): flipping one
// raises no Update look; it rides the next send.
test('flipping Shop on a saved look raises no Update look', async () => {
  mockFetch({
    ...editRoutes(twoPieces()),
    'GET /wardrobe/summary': { total: 2, categories: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  const toggle = await screen.findByTestId('source-shop');
  await waitFor(() => expect(toggle.props.accessibilityState.checked).toBe(false));
  expect(screen.queryByTestId('update-look')).toBeNull();
  await fireEvent.press(toggle);
  await waitFor(() =>
    expect(screen.getByTestId('source-shop').props.accessibilityState.checked).toBe(true),
  );
  expect(screen.queryByTestId('update-look')).toBeNull();
  // An empty send folds the bar to the sparkle (docked prompt K6).
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(screen.getByTestId('schedule-look')).toBeTruthy();
});

test('the photo strip on the look’s page keeps its back disc, so she can always leave', async () => {
  mockFetch(editRoutes(twoPieces()));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('saved-look-stack'));
  expect(await screen.findByTestId('image-manager')).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.savedLook.manager.add })).toBeTruthy();
  // Still the saved look's page: its back disc, and Schedule look at the foot.
  expect(screen.getByTestId('saved-look-back')).toBeTruthy();
  expect(screen.getByTestId('schedule-look')).toBeTruthy();
});
