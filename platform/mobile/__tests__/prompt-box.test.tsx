import type { DiaryDay } from '@robes/contracts';
import { diary, lookbook } from '@robes/copy';
import { weekdayDay } from '@robes/core/calendar';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { flyoutCta, placeChipLabel } from '../src/features/home/diary';
import { PromptBox } from '../src/features/home/PromptBox';
import { type Call, mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

// 1 Oct 2026 is a Thursday; 6 Oct a Tuesday.
const DATE = '2026-10-01';
const TUESDAY = '2026-10-06';
const WX = { city: 'Dublin', tempRange: '9–13°C', condition: 'overcast', nowC: 11, code: 3 };
const HOME = { city: 'Dublin', weather: { tempRange: '9–13°C', code: 3 } };
const dayOf = (date: string, over: Partial<DiaryDay> = {}): DiaryDay => ({
  date,
  name: null,
  place: null,
  weather: WX,
  draft: null,
  entries: [],
  ...over,
});
const ROUTES = {
  'GET /me/features': { trips: false },
  'POST /looks/prompt': { jobId: JOB_ID, status: 'queued' },
};
const onSent = jest.fn();
const box = (day: DiaryDay, hasPieces = false) => (
  <PromptBox day={day} today={DATE} home={HOME} hasPieces={hasPieces} sent={null} onSent={onSent} />
);
const promptCall = (calls: Call[]) => calls.find((c) => c.path.endsWith('/looks/prompt'));

test('the words are the web’s (lib/diary.ts)', () => {
  expect(flyoutCta(0, 0)).toEqual({ label: diary.flyout.idle, ready: false });
  expect(flyoutCta(2, 0)).toEqual({ label: diary.flyout.include(2), ready: true });
  expect(flyoutCta(0, 1)).toEqual({ label: diary.flyout.clear, ready: true });
  expect(placeChipLabel('Dublin', '9–13°C')).toBe('Dublin, 9–13°');
  expect(placeChipLabel('Dublin', null)).toBe('Dublin');
});

test('the day chip is passive and reads Today', async () => {
  mockFetch(ROUTES);
  await renderWithApi(box(dayOf(DATE)));
  expect(screen.getByTestId('day-chip').props.accessibilityLabel).toBe(
    diary.door.dayChip(diary.today),
  );
  expect(screen.getByText(diary.today)).toBeTruthy();
  expect(screen.getByLabelText(diary.door.today)).toBeTruthy();
});

test('on a day ahead the day chip reads the weekday and date', async () => {
  mockFetch(ROUTES);
  await renderWithApi(box(dayOf(TUESDAY)));
  expect(screen.getByText(weekdayDay(TUESDAY))).toBeTruthy();
  expect(screen.getByText('Tue 6')).toBeTruthy();
  expect(screen.getByLabelText(diary.door.day('Tuesday'))).toBeTruthy();
});

test('the place chip names the city with the day’s range; × leaves the weather out of the ask', async () => {
  const calls = mockFetch(ROUTES);
  await renderWithApi(box(dayOf(DATE)));
  const chip = screen.getByTestId('place-chip');
  expect(chip).toBeTruthy();
  expect(screen.getByText('Dublin')).toBeTruthy();
  expect(screen.getByText('9–13°')).toBeTruthy();
  // Nothing to send yet: no arrow.
  expect(screen.queryByTestId('prompt-send')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: diary.door.weatherOut }));
  expect(screen.queryByTestId('place-chip')).toBeNull();
  expect(screen.getByTestId('weather-chip')).toBeTruthy();
  // Weather brings the chip back; × again leaves it out for the ask.
  await fireEvent.press(screen.getByRole('button', { name: diary.door.weatherBack }));
  expect(screen.getByTestId('place-chip')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: diary.door.weatherOut }));
  await fireEvent.changeText(screen.getByLabelText(diary.door.today), 'Lunch in town');
  await fireEvent.press(await screen.findByTestId('prompt-send'));
  await waitFor(() => expect(onSent).toHaveBeenCalled());
  expect(promptCall(calls)?.body).toEqual({
    prompt: 'Lunch in town',
    date: DATE,
    draft: true,
    weather: false,
  });
});

test('typing shows the arrow; the ask carries her words and the day, and the box waits on home', async () => {
  const calls = mockFetch(ROUTES);
  await renderWithApi(box(dayOf(TUESDAY)));
  const field = screen.getByLabelText(diary.door.day('Tuesday'));
  await fireEvent.changeText(field, 'Dinner with friends');
  const send = await screen.findByTestId('prompt-send');
  expect(send.props.accessibilityLabel).toBe(diary.door.send);
  await fireEvent.press(send);
  await waitFor(() => expect(onSent).toHaveBeenCalledWith('Dinner with friends'));
  expect(promptCall(calls)?.body).toEqual({
    prompt: 'Dinner with friends',
    date: TUESDAY,
    draft: true,
  });
  // The draft dresses in the day's slot (plan 2026-11-03): no deck, the box says Robes is at work.
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(await screen.findByText(lookbook.draft.dressing)).toBeTruthy();
});

test('a draft on the day: the box is its thread — Dress it again, Adjust, View draft', async () => {
  mockFetch({ ...ROUTES, 'GET /looks': { items: [], nextCursor: null } });
  const draft = look({
    id: LOOK_ID,
    status: 'draft',
    source: 'generated',
    setId: 'ee1e1e1e-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
    dateHint: TUESDAY,
    note: 'A camel coat over the navy knit.',
    proposals: [],
  });
  await renderWithApi(
    <PromptBox
      day={dayOf(TUESDAY, { draft: { look: draft, jobId: null } })}
      today={DATE}
      home={HOME}
      hasPieces
      sent="Dinner with friends"
      onSent={onSent}
    />,
  );
  expect(await screen.findByText('Dinner with friends')).toBeTruthy();
  expect(
    screen.getByText(lookbook.draft.first('A camel coat over the navy knit.'), { exact: false }),
  ).toBeTruthy();
  // The chips are locked: no send, no hanger.
  expect(screen.queryByTestId('prompt-send')).toBeNull();
  expect(screen.queryByTestId('hanger')).toBeNull();
  expect(screen.getByRole('button', { name: lookbook.draft.redress })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.draft.view }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}?day=${TUESDAY}`);
  // Adjust opens the field for her words.
  expect(screen.queryByTestId('prompt-field')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: lookbook.draft.adjustOpt }));
  expect(await screen.findByTestId('prompt-field')).toBeTruthy();
});

test('the hanger opens the flyout; a tick readies Include 1 Piece; the token rides into the ask', async () => {
  const calls = mockFetch({
    ...ROUTES,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null, total: 1 },
  });
  await renderWithApi(box(dayOf(DATE)));
  const hanger = screen.getByTestId('hanger');
  expect(hanger.props.accessibilityLabel).toBe(diary.door.pieces);
  await fireEvent.press(hanger);
  expect(await screen.findByText(diary.flyout.title('today'))).toBeTruthy();
  expect(screen.getByText(diary.flyout.eyebrow)).toBeTruthy();
  expect(screen.getByRole('button', { name: diary.flyout.cancel })).toBeTruthy();
  expect(await screen.findByRole('button', { name: diary.flyout.photograph })).toBeTruthy();
  expect(screen.getByText(diary.flyout.adds)).toBeTruthy();
  // Idle until she ticks; the chips count her pieces.
  expect(await screen.findByTestId('flyout-idle')).toHaveTextContent(diary.flyout.idle);
  expect(screen.getByText(`${diary.flyout.all} 1`)).toBeTruthy();
  expect(screen.getByText('Outerwear 1')).toBeTruthy();
  const tile = await screen.findByTestId(`flyout-piece-${PIECE_ID}`);
  expect(tile.props.accessibilityState).toEqual({ checked: false });
  await fireEvent.press(tile);
  expect(tile.props.accessibilityState).toEqual({ checked: true });
  await fireEvent.press(screen.getByRole('button', { name: diary.flyout.include(1) }));
  // The token sits in the box; the hanger counts it.
  const token = await screen.findByTestId(`piece-token-${PIECE_ID}`);
  expect(within(token).getByText('Camel wool coat')).toBeTruthy();
  expect(screen.getByTestId('hanger').props.accessibilityLabel).toBe(diary.door.piecesOn(1));
  expect(screen.getByRole('button', { name: diary.door.removePieces })).toBeTruthy();
  // A piece is an ask on its own; the box asks once where the look's pieces come from.
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(await screen.findByText(lookbook.prompt.balance.question)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('balance-mix'));
  await waitFor(() => expect(onSent).toHaveBeenCalled());
  expect(promptCall(calls)?.body).toEqual({
    prompt: diary.door.day('Thursday'),
    date: DATE,
    draft: true,
    pieceIds: [PIECE_ID],
    balance: 'mix',
  });
});

test('the place sheet lists Home with its range; a pick goes to the day; Home clears it', async () => {
  const PARIS = { city: 'Paris', country: 'France', lat: 48.85, lon: 2.35 };
  const calls = mockFetch({
    ...ROUTES,
    'GET /today': {},
    'GET /places': { items: [{ ...PARIS, weather: { tempRange: '12–18°C', code: 0 } }] },
    [`PUT /plan/days/${DATE}/place`]: (init: RequestInit) => ({
      date: DATE,
      ...JSON.parse(String(init.body)),
    }),
  });
  await renderWithApi(box(dayOf(DATE)));
  await fireEvent.press(screen.getByRole('button', { name: diary.door.changePlace }));
  expect(await screen.findByText(diary.place.forToday)).toBeTruthy();
  expect(screen.getByText(diary.place.recent)).toBeTruthy();
  const home = screen.getByTestId('place-row-Dublin');
  expect(home.props.accessibilityLabel).toBe(`Dublin, ${diary.place.home}, 9–13°`);
  expect(home.props.accessibilityState).toEqual({ selected: true });
  // Typing asks the geocoder at a typing pace; the cities found replace Home and recent.
  await fireEvent.changeText(screen.getByTestId('place-search'), 'Par');
  expect(await screen.findByTestId('place-row-Paris')).toBeTruthy();
  expect(screen.getByText(diary.place.cities)).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/places'))?.url).toContain('q=Par');
  await fireEvent.press(screen.getByTestId('place-row-Paris'));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ place: PARIS }),
  );
  // Home again: the day's place is cleared.
  await fireEvent.press(screen.getByRole('button', { name: diary.door.changePlace }));
  await fireEvent.press(await screen.findByTestId('place-row-Dublin'));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PUT').at(-1)?.body).toEqual({ place: null }),
  );
});
