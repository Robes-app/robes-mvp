import { diary, twin } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { BodyShape } from '../src/features/you/BodyShape';
import { Colouring } from '../src/features/you/Colouring';
import { Model } from '../src/features/you/Model';
import { twinRead } from '../src/features/you/twin';
import { mockFetch, renderWithApi } from './support/api';
import { modelData, ownStand, styleDna } from './support/fixtures';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  CameraType: { front: 'front', back: 'back' },
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockParams)) delete mockParams[k];
});

const tw = twin.twinPage;
const noStyle = {
  colour: null,
  silhouette: null,
  overrides: { lovedColors: [], rejectedColors: [], measurements: {} },
  updatedAt: null,
};
const TWIN = { 'GET /me/style': noStyle, 'GET /me/dna': styleDna() };
const CLOSE_UP = 'https://media.test/media/close-up.jpg';
const model = modelData;
const twinCalls = (calls: { method: string; path: string }[]) =>
  calls.filter((c) => c.method === 'POST' && c.path.endsWith('/me/model/twin'));

test('on a Robes model (3c): its portrait, Add a selfie, the lineup, the doors closed; landing asks for the twin once', async () => {
  const calls = mockFetch({
    ...TWIN,
    'GET /me/model': model({
      stand: {
        imageUrl: 'https://media.test/catalog/avatar/w-r1@v1.png',
        generic: true,
        on: 'robes',
      },
    }),
    'POST /me/model/twin': model(),
    'PATCH /me/model': (init: RequestInit) => model({ ...JSON.parse(String(init.body)) }),
    'GET /today': {},
  });
  await renderWithApi(<Model />);
  expect(await screen.findByText(tw.robesModel, {}, { timeout: 4000 })).toBeTruthy();
  expect(screen.queryByText(tw.stageEmpty)).toBeNull();
  await waitFor(() => expect(twinCalls(calls)).toHaveLength(1));
  // The one commitment is the camera: the front camera, at once.
  await fireEvent.press(screen.getByTestId('twin-add-selfie'));
  await waitFor(() =>
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ cameraType: 'front' }),
    ),
  );
  // Colouring and Body shape are the twin's: no door opens, nothing is said under them.
  expect(screen.queryByRole('button', { name: new RegExp(tw.bodyShape) })).toBeNull();
  expect(screen.queryByRole('button', { name: new RegExp(tw.colouring) })).toBeNull();
  expect(screen.getByText(tw.colouringSub)).toBeTruthy();
  expect(screen.queryByText(tw.status('woman', 'none'))).toBeNull();
  // The lineup: the five, the first ticked, nothing of her own yet; a tap stores the pick.
  expect(screen.queryByTestId('lineup-you')).toBeNull();
  expect(screen.getByTestId('lineup-1').props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.press(screen.getByRole('radio', { name: diary.dayOne.modelPick(4) }));
  await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ preset: 4 }));
  expect(screen.queryByTestId('twin-retake')).toBeNull();
});

test('on her own twin (3d): the retake, the doors open, herself first in the lineup', async () => {
  const twinUrl = 'https://media.test/media/twin.jpg';
  const hers = model({
    filed: true,
    closeUpUrl: CLOSE_UP,
    twin: { status: 'ready', current: true, imageUrl: twinUrl },
    stand: { imageUrl: twinUrl, generic: false, on: 'twin' },
  });
  const calls = mockFetch({
    ...TWIN,
    'GET /me/model': hers,
    // The mount's ask answers with the same model (nothing changed): the page must not flip.
    'POST /me/model/twin': hers,
    'PATCH /me/model': (init: RequestInit) => model({ ...JSON.parse(String(init.body)) }),
    'GET /today': {},
  });
  await renderWithApi(<Model />);
  expect(await screen.findByTestId('twin-retake', {}, { timeout: 4000 })).toBeTruthy();
  expect(screen.queryByText(tw.robesModel)).toBeNull();
  expect(screen.queryByTestId('twin-add-selfie')).toBeNull();
  expect(screen.getByText(tw.status('woman', 'closeUp'))).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: `${tw.bodyShape}, ${tw.bodyShapeSub}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith('/you/model/body');
  expect(screen.getByTestId('lineup-you').props.accessibilityState).toMatchObject({
    checked: true,
  });
  expect(screen.getByTestId('lineup-1').props.accessibilityState).toMatchObject({ checked: false });
  await fireEvent.press(screen.getByTestId('twin-retake'));
  await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
  // A Robes model chosen over her: her selfie and twin stay; the pick is all that changes, and
  // the page turns to the Robes model's (3c) — no retake there.
  await fireEvent.press(screen.getByRole('radio', { name: diary.dayOne.modelPick(2) }));
  await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ preset: 2 }));
  await waitFor(() => expect(screen.queryByTestId('twin-retake')).toBeNull());
});

test('landed from the camera: the read is followed, then the twin asked for, the address cleaned', async () => {
  const JOB = '77777777-7777-4777-8777-777777777777';
  mockParams.read = JOB;
  const calls = mockFetch({
    ...TWIN,
    'GET /me/model': model(),
    'POST /me/model/twin': model(),
    [`GET /jobs/${JOB}`]: {
      id: JOB,
      kind: 'stylenotes_analyse',
      status: 'succeeded',
      stage: 'text',
      output: {},
      error: null,
      cancelRequested: false,
      createdAt: '2026-11-05T10:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      finishedAt: '2026-11-05T10:00:01.000Z',
    },
    'GET /today': {},
  });
  await renderWithApi(<Model />);
  // The mount's ask, then the one the landed read makes.
  await waitFor(() => expect(twinCalls(calls)).toHaveLength(2));
  expect(mockRouter.setParams).toHaveBeenCalledWith({ read: undefined });
});

const facts = (over: object = {}) => ({ ...styleDna().facts, ...over });

// The five rungs of the italic line under her model (legacy #mv-status).
test.each([
  ['both', model({ closeUpUrl: CLOSE_UP }), facts({ sizeUk: 12 })],
  ['closeUp', model({ closeUpUrl: CLOSE_UP }), facts()],
  ['facts', model(), facts({ heightCm: 170 })],
  ['hand', model({ filed: true, skinSet: true }), facts()],
  ['none', model(), facts()],
] as const)('what drew her: %s', (read, data, f) => {
  expect(twinRead(data as never, f)).toBe(read);
  expect(tw.status('woman', read)).toMatch(/\S/);
});

test('says so while her twin is being drawn, and shows the twin over the catalog cell', async () => {
  const drawing = model({
    filed: true,
    skinSet: true,
    hairSet: true,
    stand: ownStand,
    cell: { status: 'ready', imageUrl: 'https://media.test/catalog/cell.png' },
    twin: { status: 'pending', current: false, imageUrl: 'https://media.test/media/twin.jpg' },
  });
  mockFetch({ ...TWIN, 'GET /me/model': drawing, 'POST /me/model/twin': drawing });
  await renderWithApi(<Model />);
  expect(await screen.findByText(tw.drawing)).toBeTruthy();
  expect(screen.getByText(tw.caption('Tan', 'Espresso'))).toBeTruthy();
});

test('a skin or hair she never chose is never named under her model', async () => {
  const handHair = model({ filed: true, hairSet: true, stand: ownStand });
  mockFetch({ ...TWIN, 'GET /me/model': handHair, 'POST /me/model/twin': handHair });
  await renderWithApi(<Model />);
  expect(await screen.findByText(tw.caption('', 'Espresso'))).toBeTruthy();
  expect(screen.queryByText(/Tan/)).toBeNull();
});

test('body shape: the facts drawer, a scale by hand, back to her facts, a redraw on leaving', async () => {
  const calls = mockFetch({
    ...TWIN,
    'GET /me/model': model({ filed: true }),
    'POST /me/model/twin': model({ filed: true }),
    'PATCH /me/dna': (init: RequestInit) =>
      styleDna({ facts: { ...styleDna().facts, ...JSON.parse(String(init.body)).facts } }),
    'PATCH /me/model': (init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return model({
        filed: true,
        ...body,
        adj: { shoulders: null, bust: null, hips: null, ...(body.adj ?? {}) },
      });
    },
    'GET /today': {},
  });
  const view = await renderWithApi(<BodyShape />);
  await fireEvent.press(await screen.findByRole('button', { name: twin.facts.title }));
  // Plain − and + (decided 27 Oct); the drawer holds no age and no gender.
  await fireEvent.press(
    screen.getByRole('button', { name: `${twin.facts.more}: ${twin.facts.size}` }),
  );
  expect(screen.queryByRole('button', { name: '45–54' })).toBeNull();
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/me/dna'))?.body).toEqual({
      facts: { sizeUk: 10 },
    }),
  );
  // Gender is its own pill on Body shape: it opens a short list and saves on the pick.
  await fireEvent.press(
    screen.getByRole('button', { name: `${tw.gender}: ${twin.facts.genderOptions.woman}` }),
  );
  await fireEvent.press(screen.getByRole('radio', { name: twin.facts.genderOptions.man }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/me/model'))?.body).toEqual({
      presence: 'man',
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Hips: much fuller' }));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toEqual({ adj: { hips: 2 } }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: tw.backToFacts }));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toEqual({ adj: {} }),
  );
  expect(twinCalls(calls)).toHaveLength(0);
  view.unmount();
  await waitFor(() => expect(twinCalls(calls)).toHaveLength(1));
});

test('colouring offers the seasons next door; a pick changes it', async () => {
  const colourRead = {
    season: 'Soft Autumn',
    undertone: 'Warm',
    contrast: 'Low, blended',
    summary: 'Warm and dusty — never icy.',
    undertone_note: '',
    palette: [],
    neutrals: [],
    best_colours: [],
    avoid_colours: [],
    avoid_note: '',
    proof_best: '',
    proof_less: '',
    seen_on_you: [],
    metals: [],
    metals_note: '',
  };
  const calls = mockFetch({
    ...TWIN,
    'GET /me/style': { ...noStyle, colour: colourRead },
    'GET /me/model': model({ filed: true, reads: { colour: true, silhouette: false } }),
    'POST /me/model/twin': model({ filed: true }),
    'PUT /me/style/season': (init: RequestInit) => ({
      ...noStyle,
      colour: { ...colourRead, season: JSON.parse(String(init.body)).season },
    }),
  });
  await renderWithApi(<Colouring />);
  expect(await screen.findByRole('button', { name: 'True Autumn' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Soft Summer' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Light Spring' })).toBeNull();
  // No close-up card: the selfie was taken a screen earlier (plan 2026-11-05 §1.6).
  expect(screen.queryByText(tw.closeUpCard)).toBeNull();
  // Another season opens the rest, then reads Fewer seasons.
  await fireEvent.press(screen.getByRole('button', { name: tw.anotherSeason }));
  expect(screen.getByRole('button', { name: 'Light Spring' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: tw.fewerSeasons }));
  expect(screen.queryByRole('button', { name: 'Light Spring' })).toBeNull();
  // One dash: the read's own dash becomes a comma.
  expect(screen.getByText('Warm · Low, blended — Warm and dusty, never icy.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'True Autumn' }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ season: 'True Autumn' }),
  );
});

test('colouring with no read yet: the camera is still the one way to a season', async () => {
  mockFetch({
    ...TWIN,
    'GET /me/model': model({ filed: true, stand: ownStand }),
    'POST /me/model/twin': model({ filed: true }),
  });
  await renderWithApi(<Colouring />);
  expect(await screen.findByText(tw.addSeason)).toBeTruthy();
  expect(screen.getByText(tw.skinAndHairHand)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: tw.addSelfie }));
  await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
});
