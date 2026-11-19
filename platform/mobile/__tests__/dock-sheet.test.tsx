import { lookbook, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { LookScreen } from '../src/features/looks/LookScreen';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';

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
  'GET /plan': { days: [] },
});

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
  await fireEvent.press(within(screen.getByTestId('tags-view')).getByLabelText(ui.back));
  expect(await screen.findByTestId('prompt-dock')).toBeTruthy();
  expect(screen.queryByTestId('prompt-spark')).toBeNull();
});

// Dragged up to full height, the thread's close still puts the prompt away to the sparkle
// (Annie, 18 Nov: the close did nothing).
test('the thread’s close puts the sheet away from any height', async () => {
  mockFetch(routes());
  await renderWithApi(<LookScreen id={LOOK_ID} />);
  await fireEvent.press(await screen.findByTestId('prompt-spark'));
  await fireEvent.changeText(await screen.findByTestId('draft-prompt'), 'collar up');
  const drag = async (to: unknown) => {
    const modifiers = screen.getByTestId('sheet-presentation').props.modifiers as {
      $type: string;
      options?: { onSelectionChange: (d: unknown) => void };
    }[];
    const detents = modifiers.find((m) => m.$type === 'presentationDetents');
    await act(async () => detents?.options?.onSelectionChange(to));
  };
  await drag('large');
  expect(await screen.findByTestId('prompt-minimise')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('prompt-minimise'));
  await waitFor(() => expect(screen.queryByTestId('prompt-dock')).toBeNull());
  expect(screen.getByTestId('prompt-spark')).toBeTruthy();
});
