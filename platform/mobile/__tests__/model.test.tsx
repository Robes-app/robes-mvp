import { twin, you } from '@robes/copy';
import { HAIR_SWATCHES, SKIN_SWATCHES } from '@robes/core/avatar';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { LookDetail } from '../src/features/looks/LookDetail';
import { BodyShape } from '../src/features/you/BodyShape';
import { Colouring } from '../src/features/you/Colouring';
import { Model } from '../src/features/you/Model';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, styleDna } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const copy = you.model;
const tw = twin.twinPage;
const noStyle = {
  colour: null,
  silhouette: null,
  overrides: { lovedColors: [], rejectedColors: [], measurements: {} },
  updatedAt: null,
};
const TWIN = { 'GET /me/style': noStyle, 'GET /me/dna': styleDna() };
const model = (over: object = {}) => ({
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
  swatches: { skin: [...SKIN_SWATCHES], hair: [...HAIR_SWATCHES] },
  skinSet: false,
  hairSet: false,
  adj: { shoulders: null, bust: null, hips: null },
  closeUpUrl: null,
  twin: { status: 'none', current: false, imageUrl: null },
  ...over,
});
const twinCalls = (calls: { method: string; path: string }[]) =>
  calls.filter((c) => c.method === 'POST' && c.path.endsWith('/me/model/twin'));

test('her model is the hero with two doors; landing asks for the twin once', async () => {
  const calls = mockFetch({
    ...TWIN,
    'GET /me/model': model(),
    'POST /me/model/twin': model(),
    'PATCH /me/model': (init: RequestInit) =>
      model({ filed: true, ...JSON.parse(String(init.body)) }),
    'GET /today': {},
  });
  await renderWithApi(<Model />);
  expect(await screen.findByText(tw.caption('Tan', 'Espresso'))).toBeTruthy();
  await waitFor(() => expect(twinCalls(calls)).toHaveLength(1));
  // The redline cut Build your model from the twin: the hero and the two doors are all it carries.
  expect(screen.queryByRole('button', { name: copy.build })).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: `${tw.bodyShape}, ${tw.bodyShapeSub}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith('/you/model/body');
  expect(screen.queryByText(twin.facts.title)).toBeNull();
});

test('says so while her twin is being drawn, and shows the twin over the catalog cell', async () => {
  const drawing = model({
    filed: true,
    cell: { status: 'ready', imageUrl: 'https://media.test/catalog/cell.png' },
    twin: { status: 'pending', current: false, imageUrl: 'https://media.test/media/twin.jpg' },
  });
  mockFetch({ ...TWIN, 'GET /me/model': drawing, 'POST /me/model/twin': drawing });
  await renderWithApi(<Model />);
  expect(await screen.findByText(tw.drawing)).toBeTruthy();
});

test('a look offers See it on me once her model is ready, and asks for the render', async () => {
  const withPiece = look();
  const calls = mockFetch({
    [`GET /looks/${LOOK_ID}`]: withPiece,
    'GET /me/model': model({
      filed: true,
      cell: { status: 'ready', imageUrl: 'https://media.test/catalog/avatar/w-s3-h1-nt@v2.png' },
    }),
    [`POST /looks/${LOOK_ID}/render`]: {
      jobId: '66666666-6666-4666-8666-666666666666',
      status: 'queued',
    },
  });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: copy.seeOnMe }));
  await waitFor(() =>
    expect(
      calls.some((c) => c.method === 'POST' && c.path.endsWith(`/looks/${LOOK_ID}/render`)),
    ).toBe(true),
  );
});

test('without a model the look points her to build one', async () => {
  mockFetch({ [`GET /looks/${LOOK_ID}`]: look(), 'GET /me/model': model() });
  await renderWithApi(<LookDetail id={LOOK_ID} />);
  expect(await screen.findByRole('button', { name: copy.build })).toBeTruthy();
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
  await fireEvent.press(
    screen.getAllByRole('button', { name: `+ ${twin.facts.more}` })[1] as never,
  );
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/me/dna'))?.body).toEqual({
      facts: { sizeUk: 10 },
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: twin.facts.genderOptions.man }));
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
  // One dash: the read's own dash becomes a comma.
  expect(screen.getByText('Warm · Low, blended — Warm and dusty, never icy.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'True Autumn' }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ season: 'True Autumn' }),
  );
});
