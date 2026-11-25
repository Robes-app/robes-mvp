import { diary, twin, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { BodyShape } from '../src/features/you/BodyShape';
import { Colouring } from '../src/features/you/Colouring';
import { Model } from '../src/features/you/Model';
import { twinRead } from '../src/features/you/twin';
import { mockFetch, renderWithApi } from './support/api';
import { modelData, ownStand, styleDna } from './support/fixtures';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

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
  // The one commitment is the selfie: the selfie camera, her photos a tap away (designs 03–04).
  await fireEvent.press(screen.getByTestId('twin-add-selfie'));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/selfie');
  expect(screen.getByTestId('twin-robes-tag')).toBeTruthy();
  // Colouring and Body shape are the twin's: no door opens, nothing is said under them.
  expect(screen.queryByRole('button', { name: new RegExp(tw.bodyShape) })).toBeNull();
  expect(screen.queryByRole('button', { name: new RegExp(tw.colouring) })).toBeNull();
  expect(screen.getByText(tw.colouringSub)).toBeTruthy();
  // The lineup: the five, the first ticked, nothing of her own yet; a tap stores the pick.
  expect(screen.queryByTestId('lineup-you')).toBeNull();
  expect(screen.getByTestId('lineup-1').props.accessibilityState).toMatchObject({ checked: true });
  const order = () => screen.getAllByTestId(/^lineup-/).map((t) => t.props.testID);
  expect(order()).toEqual(['lineup-1', 'lineup-2', 'lineup-3', 'lineup-4', 'lineup-5']);
  await fireEvent.press(screen.getByRole('radio', { name: diary.dayOne.modelPick(4) }));
  await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ preset: 4 }));
  // The chosen one leads, ticked; the rest keep their order.
  await waitFor(() =>
    expect(order()).toEqual(['lineup-4', 'lineup-1', 'lineup-2', 'lineup-3', 'lineup-5']),
  );
  expect(screen.getByTestId('lineup-4').props.accessibilityState).toMatchObject({ checked: true });
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
  // The studio behind her headroom is the picture's top-left corner blown up: wall only, never a
  // second, blurred head over hers (Annie, 10 Nov).
  const backdrop = screen.getByTestId('twin-backdrop');
  expect(backdrop.props.contentPosition).toEqual({ top: 0, left: 0 });
  expect(backdrop.props.style).toMatchObject({ top: 0, left: 0, width: '400%', height: '400%' });
  // R17: no footer line under the doors; R18: the facts eyebrow.
  expect(screen.getByText(tw.readFrom)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: `${tw.bodyShape}, ${tw.bodyShapeSub}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith('/you/model/body');
  expect(screen.getByTestId('lineup-you').props.accessibilityState).toMatchObject({
    checked: true,
  });
  expect(screen.getByTestId('lineup-1').props.accessibilityState).toMatchObject({ checked: false });
  // R15: the redraw control opens the selfie camera.
  await fireEvent.press(screen.getByTestId('twin-retake'));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/selfie');
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

// One wait from Use photo to her twin (Annie, 10 Nov): the read changes her colouring, which picks
// another catalog model, before her twin lands — the picture she had holds until it does.
test('landed from the camera: the picture she had holds, dimmed, until her twin lands', async () => {
  const JOB = '77777777-7777-4777-8777-777777777777';
  const BEFORE = 'https://media.test/catalog/porcelain.png';
  const OTHER = 'https://media.test/catalog/peach.png';
  const TWIN_URL = 'https://media.test/media/twin-new.jpg';
  mockParams.read = JOB;
  mockRouter.setParams.mockImplementation(() => {
    delete mockParams.read;
  });
  let phase: 'reading' | 'drawing' | 'drawn' = 'reading';
  const mine = { closeUpUrl: CLOSE_UP, stand: ownStand, filed: true };
  const job = (status: string) => ({
    id: JOB,
    kind: 'stylenotes_analyse',
    status,
    stage: 'text',
    output: {},
    error: null,
    cancelRequested: false,
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
    finishedAt: status === 'succeeded' ? '2026-11-05T10:00:01.000Z' : null,
  });
  const now = () =>
    phase === 'reading'
      ? model({ ...mine, cell: { status: 'ready', imageUrl: BEFORE } })
      : phase === 'drawing'
        ? model({
            ...mine,
            cell: { status: 'ready', imageUrl: OTHER },
            twin: { status: 'pending', current: false, imageUrl: null },
          })
        : model({
            ...mine,
            cell: { status: 'ready', imageUrl: OTHER },
            twin: { status: 'ready', current: true, imageUrl: TWIN_URL },
          });
  let polls = 0;
  mockFetch({
    ...TWIN,
    'GET /me/model': () => now(),
    'POST /me/model/twin': () => now(),
    [`GET /jobs/${JOB}`]: () => {
      polls += 1;
      if (polls < 2) return job('running');
      phase = 'drawing';
      return job('succeeded');
    },
    'GET /today': {},
  });
  await renderWithApi(<Model />);
  const shown = () => screen.getByLabelText(you.model.imageAlt).props.source?.[0]?.uri;
  await waitFor(() => expect(shown()).toBe(BEFORE));
  // The read lands and her new colouring would pick another model: hers holds while she is drawn.
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ read: undefined }), {
    timeout: 6000,
  });
  expect(shown()).toBe(BEFORE);
  expect(screen.getByTestId('twin-status')).toBeTruthy();
  phase = 'drawn';
  await waitFor(() => expect(shown()).toBe(TWIN_URL), { timeout: 8000 });
  expect(screen.queryByTestId('twin-status')).toBeNull();
});

const facts = (over: object = {}) => ({ ...styleDna().facts, ...over });

// What drew her, read from her model and facts (the footer line it once fed went, redlines R17).
test.each([
  ['both', model({ closeUpUrl: CLOSE_UP }), facts({ sizeUk: 12 })],
  ['closeUp', model({ closeUpUrl: CLOSE_UP }), facts()],
  ['facts', model(), facts({ heightCm: 170 })],
  ['hand', model({ filed: true, skinSet: true }), facts()],
  ['none', model(), facts()],
] as const)('what drew her: %s', (read, data, f) => {
  expect(twinRead(data as never, f)).toBe(read);
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
  // A redraw with no selfie starts the stage's status at the drawing (designs 06–07).
  expect(await screen.findByText(tw.status[2])).toBeTruthy();
  expect(screen.getByTestId('twin-status')).toBeTruthy();
  // One wait (Annie, 10 Nov): the picture she had, dimmed under the scan; the caption is quiet.
  expect(screen.getByTestId('scan-line')).toBeTruthy();
  expect(screen.queryByText(tw.caption('Tan', 'Espresso'))).toBeNull();
});

test('a skin or hair she never chose is never named under her model', async () => {
  const handHair = model({ filed: true, hairSet: true, stand: ownStand });
  mockFetch({ ...TWIN, 'GET /me/model': handHair, 'POST /me/model/twin': handHair });
  await renderWithApi(<Model />);
  expect(await screen.findByText(tw.caption('', 'Espresso'))).toBeTruthy();
  expect(screen.queryByText(/Tan/)).toBeNull();
});

test('body shape: the facts rows, a wheel and a unit, a scale by hand, Reset, a redraw on leaving', async () => {
  const calls = mockFetch({
    ...TWIN,
    'GET /me/model': model({ filed: true }),
    'POST /me/model/twin': model({ filed: true }),
    'PATCH /me/dna': (init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return styleDna({
        facts: { ...styleDna().facts, ...(body.facts ?? {}) },
        units: body.units ?? {},
      });
    },
    'PATCH /me/model': (init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return model({
        filed: true,
        ...body,
        adj: { shoulders: null, bust: null, hips: null, waist: null, ...(body.adj ?? {}) },
      });
    },
    'GET /today': {},
  });
  const view = await renderWithApi(<BodyShape />);
  const f = twin.facts;
  // Her five rows, each "Add" until given; a row opens The facts.
  await fireEvent.press(await screen.findByRole('button', { name: f.rowLabel(f.size, '') }));
  // A row opens its wheel in the same sheet, on the middle when she has given nothing.
  await fireEvent.press(await screen.findByTestId('fact-size'));
  const dnaPatches = () =>
    calls.filter((c) => c.method === 'PATCH' && c.path.endsWith('/me/dna')).map((c) => c.body);
  // The wheel scrolls (Annie, 25 Nov): where it comes to rest is saved — two rows past the middle
  // (UK 10, the fourth of UK 4–24) is UK 14.
  await fireEvent(await screen.findByTestId(`wheel-${twin.facts.size}`), 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: 0, y: 5 * 44 } },
  });
  await waitFor(() => expect(dnaPatches()).toEqual([{ facts: { sizeUk: 14 } }]));
  // A tap scrolls a value into the band and saves it.
  await fireEvent.press(await screen.findByRole('button', { name: 'UK 10' }));
  await waitFor(() => expect(dnaPatches().at(-1)).toEqual({ facts: { sizeUk: 10 } }));
  // A unit changes how it reads, never what is saved.
  await fireEvent.press(screen.getByRole('button', { name: 'US' }));
  await waitFor(() =>
    expect(calls.filter((c) => c.path.endsWith('/me/dna')).at(-1)?.body).toEqual({
      units: { size: 'us' },
    }),
  );
  // Age and gender live in Style DNA › You (Annie, 7 Nov): Body shape asks for neither.
  expect(screen.queryByRole('button', { name: '45–54' })).toBeNull();
  await fireEvent.press(screen.getByTestId('facts-done'));
  await fireEvent.press(screen.getByRole('radio', { name: 'Hips: much fuller' }));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toEqual({ adj: { hips: 2 } }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: tw.reset }));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toEqual({ adj: {} }),
  );
  expect(twinCalls(calls)).toHaveLength(0);
  view.unmount();
  await waitFor(() => expect(twinCalls(calls)).toHaveLength(1));
});

test('body shape: his seven rows and a waist scale where hers has hips', async () => {
  const him = model({ filed: true, presence: 'man' });
  mockFetch({
    ...TWIN,
    'GET /me/dna': styleDna({
      gender: 'man',
      facts: { ...styleDna().facts, chestCm: 101.6, collarCm: 39.4 },
      units: { collar: 'cm' },
    }),
    'GET /me/model': him,
    'POST /me/model/twin': him,
  });
  await renderWithApi(<BodyShape />);
  const f = twin.facts;
  expect(await screen.findByRole('button', { name: f.rowLabel(f.chest, '40 in') })).toBeTruthy();
  expect(screen.getByRole('button', { name: f.rowLabel(f.collar, '39 cm') })).toBeTruthy();
  for (const field of [f.height, f.waist, f.inseam, f.shoes, f.shoulders]) {
    expect(screen.getByRole('button', { name: f.rowLabel(field, '') })).toBeTruthy();
  }
  expect(screen.queryByRole('button', { name: f.rowLabel(f.size, '') })).toBeNull();
  expect(screen.getByRole('radio', { name: 'Waist: much fuller' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'Hips: much fuller' })).toBeNull();
});

test('body shape: Clear the facts asks first, then empties every measurement', async () => {
  const calls = mockFetch({
    ...TWIN,
    'GET /me/dna': styleDna({ facts: { ...styleDna().facts, heightCm: 166, sizeUk: 12 } }),
    'PATCH /me/dna': styleDna(),
    'GET /me/model': model({ filed: true }),
    'POST /me/model/twin': model({ filed: true }),
  });
  await renderWithApi(<BodyShape />);
  const f = twin.facts;
  await fireEvent.press(
    await screen.findByRole('button', { name: f.rowLabel(f.height, '166 cm') }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: f.clear }));
  await fireEvent.press(await screen.findByRole('button', { name: f.clearAsk.confirm }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/me/dna'))?.body).toEqual({
      facts: {
        heightCm: null,
        sizeUk: null,
        shoeUk: null,
        bustBand: null,
        bustCup: null,
        bustCm: null,
        waistCm: null,
        chestCm: null,
        inseamCm: null,
        collarCm: null,
        shoulderWidthCm: null,
      },
    }),
  );
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
  expect(screen.queryByText('Your close-up')).toBeNull();
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
  expect(mockRouter.push).toHaveBeenCalledWith('/you/selfie');
});
