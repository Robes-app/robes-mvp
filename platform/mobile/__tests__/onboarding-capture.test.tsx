import type { Consents } from '@robes/contracts';
import { firstRun as copy, twin } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CaptureStep } from '../src/features/onboarding/CaptureStep';
import { OutfitStep } from '../src/features/onboarding/OutfitStep';
import { TwinStep } from '../src/features/onboarding/TwinStep';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, modelData, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
// Each photograph's upload, answered with an asset id per photo.
let mockUploads = 0;
jest.mock('../src/features/wardrobe/add-pieces', () => ({
  ...jest.requireActual('../src/features/wardrobe/add-pieces'),
  uploadPhoto: jest.fn(async () => `00000000-0000-4000-8000-00000000000${++mockUploads}`),
}));
// The shared camera stands in as two buttons: take a photo, and its done pill (Save N).
// Home's capture camera stands in as its Use photo.
jest.mock('../src/features/capture/CaptureCamera', () => {
  const { Pressable, Text } = require('react-native');
  return {
    CaptureCamera: (props: { onUse: (p: { uri: string }) => void }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="use photo"
        onPress={() => props.onUse({ uri: 'file:///outfit.jpg' })}
      >
        <Text>use photo</Text>
      </Pressable>
    ),
  };
});
jest.mock('../src/features/capture/ShotCamera', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ShotCamera: (props: {
      shots: { key: string }[];
      canDone: boolean;
      copy: { done: (n: number) => string };
      onAdd: (p: { uri: string; width: number; height: number }) => void;
      onDone: () => void;
    }) => (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="shoot"
          onPress={() => props.onAdd({ uri: 'file:///shot.jpg', width: 1200, height: 1600 })}
        >
          <Text>shoot</Text>
        </Pressable>
        {props.shots.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.copy.done(props.shots.length)}
            disabled={!props.canDone}
            onPress={props.onDone}
          >
            <Text>{props.copy.done(props.shots.length)}</Text>
          </Pressable>
        ) : null}
      </>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUploads = 0;
});

const asset = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const shoot = async (n: number) => {
  for (let i = 0; i < n; i++)
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'shoot' }));
    });
};
const steps = { step: 5, onBack: jest.fn(), onSkip: jest.fn() };

test('Saved looks: each photo saves as its own look, its picture the photo, no piece filed', async () => {
  const onDone = jest.fn();
  const calls = mockFetch({ 'POST /looks': look() });
  await renderWithApi(<CaptureStep {...steps} mode="looks" onDone={onDone} />);
  await fireEvent.press(screen.getByRole('button', { name: copy.looks.choose }));
  await shoot(2);
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.save(2) }));
  });
  expect(
    await screen.findByText(`${copy.looks.saved} ${copy.looks.savedEm(2)}`, { exact: false }),
  ).toBeTruthy();
  expect(copy.looks.savedEm(2)).toBe('Two new looks.');
  expect(calls.filter((c) => c.path.endsWith('/looks')).map((c) => c.body)).toEqual([
    { status: 'saved', pieces: [], photoAssetId: asset(1) },
    { status: 'saved', pieces: [], photoAssetId: asset(2) },
  ]);
  await fireEvent.press(screen.getByRole('button', { name: copy.continue }));
  expect(onDone).toHaveBeenCalledWith(2);
});

test('Pieces you love: one piece per photo, each starred; past the Hero Rack it files unstarred, unsaid', async () => {
  const second = '22222222-2222-4222-8222-222222222222';
  const calls = mockFetch({
    'POST /wardrobe/items/batch': {
      pieces: [piece(), piece({ id: second })],
      jobs: [],
    },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece(),
    [`PATCH /wardrobe/items/${second}`]: errorReply(409, 'conflict'),
  });
  await renderWithApi(<CaptureStep {...steps} mode="pieces" onDone={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: copy.pieces.add }));
  await shoot(2);
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.save(2) }));
  });
  expect(
    await screen.findByText(`${copy.pieces.saved} ${copy.pieces.savedEm(2)}`, { exact: false }),
  ).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/batch'))?.body).toEqual({
    assetIds: [asset(1), asset(2)],
  });
  expect(calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([
    { hero: true },
    { hero: true },
  ]);
  expect(screen.queryByText(copy.pieces.failed)).toBeNull();
});

test('a failed save keeps nothing and says so', async () => {
  mockFetch({ 'POST /looks': errorReply(500, 'internal') });
  await renderWithApi(<CaptureStep {...steps} mode="looks" onDone={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: copy.looks.choose }));
  await shoot(1);
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.save(1) }));
  });
  expect(await screen.findByText(copy.looks.failed)).toBeTruthy();
});

const CONSENTS: Consents = {
  analytics: null,
  replay: null,
  marketing_email: null,
  photo_analysis: null,
  look_sharing: null,
  recordings: null,
};

test('Digital twin: no close-up before her yes, which is saved before the camera opens', async () => {
  const calls = mockFetch({
    'GET /me/model': modelData(),
    'GET /me/consents': CONSENTS,
    'POST /me/consents': { ...CONSENTS, photo_analysis: true },
  });
  await renderWithApi(
    <TwinStep
      step={7}
      onBack={jest.fn()}
      onDone={jest.fn()}
      onSkip={jest.fn()}
      read={{ reading: false, error: null }}
    />,
  );
  const go = await screen.findByRole('button', { name: copy.twin.go });
  expect(go.props.accessibilityState?.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('checkbox', { name: copy.twin.agree }));
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.twin.go }));
  });
  await waitFor(() =>
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/you/selfie',
      params: { from: 'onboarding' },
    }),
  );
  const consentAt = calls.findIndex((c) => c.path.endsWith('/me/consents') && c.method === 'POST');
  expect(calls[consentAt]?.body).toMatchObject({ consents: { photo_analysis: true } });
});

test('Digital twin: while her twin draws, her close-up stands under the status and Continue goes on', async () => {
  const onDone = jest.fn();
  mockFetch({
    'GET /me/model': modelData({
      closeUpUrl: 'https://media.test/close-up.jpg',
      twin: { status: 'pending', current: false, imageUrl: null },
    }),
    'GET /me/consents': { ...CONSENTS, photo_analysis: true },
  });
  await renderWithApi(
    <TwinStep
      step={7}
      onBack={jest.fn()}
      onDone={onDone}
      onSkip={jest.fn()}
      read={{ reading: false, error: null }}
    />,
  );
  expect(await screen.findByTestId('twin-status')).toBeTruthy();
  expect(screen.getByLabelText(twin.twinPage.you)).toBeTruthy();
  // R-S4: she never waits on the drawing.
  const next = screen.getByRole('button', { name: copy.continue });
  expect(next.props.accessibilityState?.disabled).toBeFalsy();
  await fireEvent.press(next);
  expect(onDone).toHaveBeenCalledWith(true);
});

test('Today’s outfit saves her photo as a look on today and goes Home, no draft drawer', async () => {
  const onSaved = jest.fn();
  const calls = mockFetch({
    'POST /looks': look(),
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
  });
  await renderWithApi(
    <OutfitStep
      step={8}
      busy={false}
      error={null}
      onBack={jest.fn()}
      onSaved={onSaved}
      onSkip={jest.fn()}
      today="2026-11-17"
    />,
  );
  expect(screen.getByText(copy.outfit.today('Tue 17 Nov'))).toBeTruthy();
  await fireEvent.press(screen.getByTestId('onboarding-capture'));
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: 'use photo' }));
  });
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith('2026-11-17', LOOK_ID));
  expect(calls.find((c) => c.path.endsWith('/looks'))?.body).toEqual({
    status: 'saved',
    pieces: [],
    photoAssetId: asset(1),
  });
  expect(calls.find((c) => c.path.endsWith('/days'))?.body).toEqual({ dates: ['2026-11-17'] });
  expect(calls.some((c) => c.path.includes('/drafts'))).toBe(false);
});
