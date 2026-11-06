import { lookbook, looks, you } from '@robes/copy';
import { longDate, monthOf, shiftMonth } from '@robes/core/calendar';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { LookDetail } from '../src/features/looks/LookDetail';
import { localDate, nextDays } from '../src/features/looks/saved-looks';
import { nativeAnalytics } from '../src/lib/analytics';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: you.model.undressed }));
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
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
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  // No facts line under the photo (D16): the wears live behind Details › Worn (Felix 3e), each
  // with its weekday.
  await fireEvent.press(await screen.findByRole('tab', { name: lookbook.savedLook.tabs.details }));
  expect(screen.queryByText(/pinned for/)).toBeNull();
  await fireEvent.press(await screen.findByTestId('details-worn'));
  expect(await screen.findByText('Tue 8 Sep')).toBeTruthy();
});

// Edit look, the adjust disc and Home's Edit disc (Felix 3k) open the draft sheet in edit mode
// (D14): the rack is worked there, and Delete lives there (D9).
test('Edit look and the adjust disc open the draft sheet; `edit` opens it as the look opens', async () => {
  mockFetch({
    [`GET /looks/${LOOK_ID}`]: look(),
    [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: lookbook.savedLook.edit }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}`);
  await fireEvent.press(screen.getByTestId('saved-look-adjust'));
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}?sheet=adjust`);
  // The ledger stays: the rows carry their wear counts, never swap or remove.
  expect(screen.queryByRole('button', { name: lookbook.rack.swap('Camel wool coat') })).toBeNull();
  expect(screen.queryByText(looks.page.remove)).toBeNull();
  expect(screen.queryByRole('button', { name: lookbook.bar.update })).toBeNull();

  mockRouter.push.mockClear();
  await renderWithApi(<LookDetail id={LOOK_ID} edit />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}`));
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
});
