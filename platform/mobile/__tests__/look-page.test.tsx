import type { Look } from '@robes/contracts';
import { lookbook, looks } from '@robes/copy';
import { longDate, monthOf, shiftMonth } from '@robes/core/calendar';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { LookScreen } from '../src/features/looks/LookScreen';
import { localDate, nextDays } from '../src/features/looks/saved-looks';
import { nativeAnalytics } from '../src/lib/analytics';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, modelData, PIECE_ID, piece } from './support/fixtures';
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
  expect(screen.queryByText(lookbook.eyebrow.saved)).toBeNull();
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

test('3e edits in place: no Edit chip, the pencil reveals swap and ×, the adjust disc stays on the look', async () => {
  mockFetch(editRoutes(twoPieces()));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  // At rest a row opens its piece (PRD §6.1, plan R2); the pencil shows the swap and ×.
  expect(await screen.findByText(lookbook.draftLook.rack)).toBeTruthy();
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
  expect(screen.queryByRole('button', { name: lookbook.savedLook.edit })).toBeNull();
  // The prompt card reads "Describe other changes…" with no chip of its own; nothing waits yet.
  expect(screen.getByLabelText(lookbook.draftLook.editPlaceholder)).toBeTruthy();
  expect(screen.queryByTestId('draft-generate')).toBeNull();
  expect(screen.queryByTestId('update-look')).toBeNull();
  // No header: the back disc rides the photo, Schedule look holds the foot.
  expect(screen.queryByTestId('draft-close')).toBeNull();
  expect(screen.getByTestId('saved-look-back')).toBeTruthy();
  expect(screen.getByTestId('schedule-look')).toBeTruthy();
  // The adjust disc opens the AdjustSheet over the look — never the draft sheet.
  await fireEvent.press(screen.getByTestId('draft-adjust'));
  expect(await screen.findByTestId('adjust-sheet')).toBeTruthy();
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

test('words typed wait for Update look, which sends them and writes the answered rack', async () => {
  const calls = mockFetch({
    ...editRoutes(twoPieces()),
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
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'collar up on the coat');
  // Typed words are a change waiting too: the pill shows; nothing is sent until it is pressed.
  expect(screen.getByTestId('update-look')).toBeTruthy();
  expect(calls.some((c) => c.path.endsWith('/ask'))).toBe(false);
  await fireEvent.press(screen.getByTestId('update-look'));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/ask'))?.body).toMatchObject({
      text: 'collar up on the coat',
      surface: 'saved',
    }),
  );
  expect(await screen.findByText('Collar up.')).toBeTruthy();
  // The write waits for the answer to land on the rack.
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.findIndex((c) => c.path.endsWith('/ask'))).toBeLessThan(
    calls.findIndex((c) => c.method === 'PATCH'),
  );
  const patch = calls.find((c) => c.method === 'PATCH')?.body as { styling: unknown };
  expect(patch.styling).toEqual({ [PIECE_ID]: 'collar up' });
});

// Adjust model image is for Robes' picture alone (PRD §6.4): a look whose record is her own
// photograph carries no disc.
test('the adjust disc is not on a photograph of hers', async () => {
  const photo = piece().image;
  mockFetch(
    editRoutes(
      twoPieces().photo === null
        ? { ...twoPieces(), photo, image: photo, record: 'photo' as const }
        : twoPieces(),
    ),
  );
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  expect(await screen.findByTestId('saved-look-back')).toBeTruthy();
  expect(screen.queryByTestId('draft-adjust')).toBeNull();
});

// The Shop toggle on a saved look (PRD §6.1): flipping it counts as a change and enables Update.
test('flipping Shop on a saved look waits for Update look', async () => {
  mockFetch({
    ...editRoutes(twoPieces()),
    'GET /wardrobe/summary': { total: 2, categories: [] },
  });
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  const toggle = await screen.findByTestId('shop-toggle');
  await waitFor(() => expect(toggle.props.accessibilityState.checked).toBe(false));
  expect(screen.queryByTestId('update-look')).toBeNull();
  await fireEvent.press(toggle);
  expect(screen.getByTestId('update-look')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('shop-toggle'));
  await waitFor(() => expect(screen.queryByTestId('update-look')).toBeNull());
});

test('Home’s image stack lands on the Add a photo card of the look’s detail', async () => {
  mockFetch(editRoutes(twoPieces()));
  await renderWithApi(<LookScreen id={LOOK_ID} addPhoto />);
  expect(await screen.findByTestId('image-manager')).toBeTruthy();
  expect(screen.getByRole('button', { name: lookbook.savedLook.manager.add })).toBeTruthy();
  // Still the saved look's page: its back disc, and Schedule look at the foot.
  expect(screen.getByTestId('schedule-look')).toBeTruthy();
});
