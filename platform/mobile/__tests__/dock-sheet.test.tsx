import { lookbook, tags as tagsCopy } from '@robes/copy';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { LookScreen } from '../src/features/looks/LookScreen';
import { nativeAnalytics } from '../src/lib/analytics';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, PIECE_ID, piece } from './support/fixtures';

jest.spyOn(nativeAnalytics, 'track');

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

// On iOS the docked prompt's bar and thread are iOS's own sheet (docked prompt PRD phase 3).
// These drive that sheet; the other look tests drive the drawn dock.
beforeAll(() => {
  process.env.ROBES_DRAWN_DOCK = '0';
});
afterAll(() => {
  process.env.ROBES_DRAWN_DOCK = '1';
});
beforeEach(() => jest.clearAllMocks());

const routes = () => ({
  [`GET /looks/${LOOK_ID}`]: look(),
  [`GET /looks/${LOOK_ID}/wears`]: { items: [] },
  'GET /looks': { items: [], nextCursor: null },
  'GET /tags': { items: [] },
  'GET /plan': { days: [] },
});

// Drags iOS's sheet to a height, as iOS reports it.
async function drag(to: unknown) {
  const modifiers = screen.getByTestId('sheet-presentation').props.modifiers as {
    $type: string;
    options?: { onSelectionChange: (d: unknown) => void };
  }[];
  const detents = modifiers.find((m) => m.$type === 'presentationDetents');
  await act(async () => detents?.options?.onSelectionChange(to));
}

// The sparkle presents the sheet at the bar: its field is the real one, so a tap types there,
// with no second sheet to type in (Q4), and the drawn bar is gone.
test('the sparkle presents iOS’s sheet at the bar, its field the real one', async () => {
  mockFetch(routes());
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  expect(screen.queryByTestId('prompt-dock')).toBeNull();
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  expect(await screen.findByTestId('prompt-dock')).toBeTruthy();
  expect(screen.queryByTestId('prompt-bar')).toBeNull();
  expect(screen.getByTestId('draft-prompt').props.autoFocus).toBe(false);
  // Its heights: the bar, the thread, full; the look live under the bar.
  const presentation = screen.getByTestId('sheet-presentation');
  const types = (presentation.props.modifiers as { $type: string }[]).map((m) => m.$type);
  expect(types).toEqual(
    expect.arrayContaining([
      'presentationDetents',
      'presentationBackgroundInteraction',
      'presentationCornerRadius',
    ]),
  );
});

// iOS presents nothing over a sheet still on screen (Annie, 18 Nov: ✕ did nothing with the bar
// up): the sheet steps aside for what the screen presents, and comes back as she left it.
test('the sheet steps aside for Tags and comes back at the bar once it closes', async () => {
  mockFetch(routes());
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  expect(await screen.findByTestId('prompt-dock')).toBeTruthy();
  // The look stays live under the bar: Details and its Tags row answer.
  await fireEvent.press(screen.getByRole('tab', { name: lookbook.savedLook.tabs.details }));
  await fireEvent.press(await screen.findByTestId('details-tags'));
  await waitFor(() => expect(screen.queryByTestId('prompt-dock')).toBeNull());
  expect(await screen.findByTestId('tags-view')).toBeTruthy();
  // Tags closed, the bar is back where she left it, not the sparkle.
  await fireEvent.press(
    within(screen.getByTestId('tags-view')).getByRole('button', { name: tagsCopy.done }),
  );
  expect(await screen.findByTestId('prompt-dock')).toBeTruthy();
  expect(screen.queryByTestId('prompt-spark')).toBeNull();
});

// On a saved look her send keeps the sheet up at the bar on Robes at work (Annie, 26 Nov, D6:
// the fold on her send read as broken). Robes' words alone keep it there, on the reply; a change
// folds it to the sparkle once Robes asks about it, the dot holding the question.
const ASK_JOB = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const asked = (answer: object) => ({
  ...routes(),
  [`GET /looks/${LOOK_ID}`]: look({ model: piece().image, onModel: 'ready' }),
  [`PATCH /looks/${LOOK_ID}`]: look({ model: piece().image, onModel: 'ready' }),
  // The picture's drawing is refused, so Robes asks at once.
  [`POST /looks/${LOOK_ID}/render`]: errorReply(503, 'unavailable'),
  [`POST /looks/${LOOK_ID}/ask`]: { jobId: ASK_JOB, status: 'queued' },
  [`GET /jobs/${ASK_JOB}`]: {
    id: ASK_JOB,
    kind: 'look_ask',
    status: 'succeeded',
    stage: 'done',
    output: {
      ask: {
        swaps: [],
        back: [],
        backAll: false,
        styled: [],
        draft: '',
        rule: '',
        noticed: false,
        ...answer,
      },
    },
    error: null,
    cancelRequested: false,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    finishedAt: '2026-10-15T10:00:01.000Z',
  },
});

test('a saved look’s send keeps the sheet at the bar; Robes’ words alone stay on it', async () => {
  mockFetch(asked({ intent: 'clarify', reply: 'Which coat do you mean?' }));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'swap the coat');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(await screen.findByText('Which coat do you mean?')).toBeTruthy();
  expect(screen.getByTestId('prompt-dock')).toBeTruthy();
  expect(screen.queryByTestId('prompt-spark')).toBeNull();
  expect(nativeAnalytics.track).not.toHaveBeenCalledWith(
    'dock_state_changed',
    expect.objectContaining({ to: 'spark' }),
  );
});

test('a saved look’s change folds the sheet to the sparkle once Robes asks about it', async () => {
  mockFetch(
    asked({
      intent: 'styled',
      reply: 'Collar up.',
      styled: [{ key: PIECE_ID, note: 'collar up' }],
      followUp: 'How does the collar look?',
    }),
  );
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'collar up');
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(
    await screen.findByTestId(
      'prompt-spark-dot',
      { includeHiddenElements: true },
      { timeout: 8000 },
    ),
  ).toBeTruthy();
  expect(screen.queryByTestId('prompt-dock')).toBeNull();
  // One fold for the send, the answer's: never a fold while Robes worked and another after.
  const folds = (nativeAnalytics.track as jest.Mock).mock.calls.filter(
    ([event, props]) => event === 'dock_state_changed' && props.to === 'spark',
  );
  expect(folds).toHaveLength(1);
  await fireEvent.press(screen.getByTestId('prompt-spark'));
  expect(await screen.findByText('How does the collar look?')).toBeTruthy();
}, 20_000);

// The thread folds by the same rule as the bar (Annie, 26 Nov, D6): sent from the open thread,
// the sheet stays at the thread while Robes works; a change folds it to the sparkle once Robes
// asks about it, and Robes' words alone keep it open on them.
test('a saved look’s send from the thread keeps it open; a change folds it once Robes asks', async () => {
  mockFetch(
    asked({
      intent: 'styled',
      reply: 'Collar up.',
      styled: [{ key: PIECE_ID, note: 'collar up' }],
      followUp: 'How does the collar look?',
    }),
  );
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'collar up');
  await drag('large');
  expect(await screen.findByTestId('prompt-minimise')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(
    await screen.findByTestId(
      'prompt-spark-dot',
      { includeHiddenElements: true },
      { timeout: 8000 },
    ),
  ).toBeTruthy();
  expect(screen.queryByTestId('prompt-dock')).toBeNull();
  // One move after her send: the thread straight to the sparkle, never by the bar.
  const moves = (nativeAnalytics.track as jest.Mock).mock.calls
    .filter(([event]) => event === 'dock_state_changed')
    .map(([, props]) => `${props.from}>${props.to}`);
  expect(moves).toEqual(['spark>bar', 'bar>thread', 'thread>spark']);
}, 20_000);

test('a saved look’s send from the thread stays on the thread when Robes only replies', async () => {
  mockFetch(asked({ intent: 'clarify', reply: 'Which coat do you mean?' }));
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'swap the coat');
  await drag('large');
  expect(await screen.findByTestId('prompt-minimise')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-send'));
  expect(await screen.findByText('Which coat do you mean?')).toBeTruthy();
  expect(screen.getByTestId('prompt-minimise')).toBeTruthy();
  expect(screen.queryByTestId('prompt-spark')).toBeNull();
  expect(nativeAnalytics.track).not.toHaveBeenCalledWith(
    'dock_state_changed',
    expect.objectContaining({ to: 'spark' }),
  );
});

// Dragged up to full height, the thread's close still puts the prompt away to the sparkle
// (Annie, 18 Nov: the close did nothing).
test('the thread’s close puts the sheet away from any height', async () => {
  mockFetch(routes());
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'collar up');
  // A bar height from before the bar resized (Robes' line arriving while the sheet stays up,
  // Annie 26 Nov, D6) is still the bar, never the full sheet.
  await drag({ height: 999 });
  expect(screen.queryByTestId('prompt-minimise')).toBeNull();
  expect(screen.getByTestId('prompt-dock')).toBeTruthy();
  await drag('large');
  expect(await screen.findByTestId('prompt-minimise')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-minimise'));
  await waitFor(() => expect(screen.queryByTestId('prompt-dock')).toBeNull());
  expect(screen.getByTestId('prompt-spark')).toBeTruthy();
});
