import { firstRun, twin, you } from '@robes/copy';
import { asSentence } from '@robes/core';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Observations } from '../src/features/you/Observations';
import { StyleDna } from '../src/features/you/StyleDna';
import { mockFetch, renderWithApi } from './support/api';
import {
  JOB_ID,
  LINE_ID,
  modelData,
  NOTICE_ID,
  PIECE_ID,
  piece,
  styleDna,
} from './support/fixtures';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const patchEcho = (init: RequestInit) => {
  const input = JSON.parse(String(init.body));
  return styleDna({
    ...(input.types ? { types: input.types } : {}),
    ...(input.brands ? { brands: input.brands } : {}),
    ...(input.investment ? { investment: input.investment } : {}),
  });
};
const kept = (list: 'loves' | 'avoids' | 'rules', text: string, chip: string | null = null) => ({
  id: LINE_ID,
  list,
  text,
  source: 'typed' as const,
  chip,
  keptAt: '2026-10-01T10:00:00.000Z',
});

test('Style DNA: one row for her style rules, and no Icons', async () => {
  mockFetch({ 'GET /me/dna': styleDna() });
  await renderWithApi(<StyleDna />);
  expect(
    await screen.findByRole('button', { name: `${twin.dnaPage.styleRules}, Not yet` }),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Icons/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Hard nos/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Your rules/ })).toBeNull();
});

test('Style type is onboarding’s photo cards: a heart keeps the type at once', async () => {
  const calls = mockFetch({ 'GET /me/dna': styleDna(), 'PATCH /me/dna': patchEcho });
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${twin.dnaPage.styleType}, ${twin.dnaPage.notYet}`,
    }),
  );
  const minimal = firstRun.styles.love('Minimal');
  await fireEvent.press(screen.getByRole('button', { name: minimal }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ types: ['Minimal'] }),
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: minimal }).props.accessibilityState).toMatchObject({
      selected: true,
    }),
  );
});

test('You: her gender saves as a model pick and her age as a fact, above her taste', async () => {
  const f = twin.facts;
  const calls = mockFetch({
    'GET /me/dna': styleDna(),
    'PATCH /me/dna': (init: RequestInit) =>
      styleDna({ facts: { ...styleDna().facts, ...JSON.parse(String(init.body)).facts } }),
    'GET /me/model': modelData(),
    'PATCH /me/model': (init: RequestInit) => modelData(JSON.parse(String(init.body))),
    'GET /today': {},
  });
  await renderWithApi(<StyleDna />);
  const gender = await screen.findByRole('button', {
    name: `${f.gender}, ${f.genderOptions.woman}`,
  });
  // The You group comes first, Gender before Age before anything of her taste.
  const labels = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
  expect(labels.indexOf(gender.props.accessibilityLabel)).toBe(0);
  expect(labels[1]).toBe(`${f.age}, ${twin.dnaPage.notYet}`);
  await fireEvent.press(gender);
  await fireEvent.press(screen.getByRole('radio', { name: f.genderOptions.man }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/me/model'))?.body).toEqual({
      presence: 'man',
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: `${f.age}, ${twin.dnaPage.notYet}` }));
  await fireEvent.press(screen.getByRole('radio', { name: '45–54' }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/me/dna'))?.body).toEqual({
      facts: { ageBand: '45_54' },
    }),
  );
});

test('Your colours: a family on Love and a shade on Avoid save the whole palette', async () => {
  const empty = { fam: {}, shade: {}, print: {} };
  const style = (palette: object) => ({
    colour: null,
    silhouette: null,
    overrides: { lovedColors: [], rejectedColors: [], measurements: {} },
    palette,
    updatedAt: null,
  });
  const calls = mockFetch({
    'GET /me/dna': styleDna(),
    'GET /me/style': style(empty),
    'PUT /me/style/palette': (init: RequestInit) => style(JSON.parse(String(init.body))),
  });
  const copy = you.style.palette;
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${copy.coloursTitle}, ${copy.summary([])}` }),
  );
  const blues = within(await screen.findByLabelText('Blues'));
  await fireEvent.press(blues.getByRole('radio', { name: copy.states.love }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ ...empty, fam: { blues: 1 } }),
  );
  // The tile and the name ARE the disclosure (legacy .pf-open) — there is no separate toggle.
  await fireEvent.press(await screen.findByLabelText(copy.shades('Blues')));
  // A shade with no answer of its own says whose it is taking (legacy .pf-ctl aria-label).
  const cobalt = within(await screen.findByLabelText('Cobalt: following Blues'));
  await fireEvent.press(cobalt.getByRole('radio', { name: copy.states.avoid }));
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'PUT').at(-1)?.body).toEqual({
      fam: { blues: 1 },
      shade: { cobalt: -1 },
      print: {},
    }),
  );
});

test('Your prints: each print row carries its own swatch, as the web', async () => {
  const style = {
    colour: null,
    silhouette: null,
    overrides: { lovedColors: [], rejectedColors: [], measurements: {} },
    palette: { fam: {}, shade: {}, print: { stripes: 1 } },
    updatedAt: null,
  };
  mockFetch({ 'GET /me/dna': styleDna(), 'GET /me/style': style });
  const copy = you.style.palette;
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${copy.printsTitle}, ${copy.summary(['Stripes'])}`,
    }),
  );
  expect(await screen.findByTestId('print-swatch-stripes')).toBeTruthy();
  expect(screen.getByTestId('print-swatch-dots')).toBeTruthy();
});

test('Pieces you love shows each starred piece with its photograph', async () => {
  const { id, label, category, brand, image } = piece({ brand: 'COS' });
  mockFetch({ 'GET /me/dna': styleDna({ pieces: [{ id, label, category, brand, image }] }) });
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${twin.dnaPage.pieces}, ${twin.dnaPage.piecesCount(1)}`,
    }),
  );
  expect(
    await screen.findByTestId(`loved-photo-${PIECE_ID}`, { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: label })).toBeTruthy();
});

test('the brand wall is onboarding’s tiles: a tap keeps a house, the dashed tile adds one', async () => {
  const calls = mockFetch({ 'GET /me/dna': styleDna(), 'PATCH /me/dna': patchEcho });
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${twin.dnaPage.brands}, ${twin.dnaPage.notYet}` }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'COS' }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ brands: ['COS'] }),
  );
  calls.length = 0;
  await fireEvent.changeText(screen.getByLabelText(twin.wall.searchBrands), 'Atelier Nouveau');
  await fireEvent.press(screen.getByRole('button', { name: twin.wall.add('Atelier Nouveau') }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
      brands: ['COS', 'Atelier Nouveau'],
    }),
  );
});

test('style rules: Never files a hard-no chip; × strikes it', async () => {
  let dna = styleDna();
  const calls = mockFetch({
    'GET /me/dna': () => dna,
    'POST /me/dna/lines': (init: RequestInit) => {
      const { text, chip } = JSON.parse(String(init.body));
      dna = styleDna({ brief: { ...dna.brief, avoids: [kept('avoids', text, chip ?? null)] } });
      return dna;
    },
    [`DELETE /me/dna/lines/${LINE_ID}`]: () => {
      dna = styleDna();
      return dna;
    },
  });
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${twin.dnaPage.styleRules}, Not yet` }),
  );
  // Always (her rules) opens first; its chips are the musts.
  expect(screen.getByRole('button', { name: twin.words.chip('Head covered') })).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: twin.words.never }));
  await fireEvent.press(screen.getByRole('button', { name: twin.words.chip('Heels') }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      list: 'avoids',
      text: 'Heels',
      chip: 'Heels',
    }),
  );
  // A filed chip leaves the chips and joins her lines.
  expect(await screen.findByRole('button', { name: twin.words.strike('Heels') })).toBeTruthy();
  expect(screen.queryByRole('button', { name: twin.words.chip('Heels') })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: twin.words.strike('Heels') }));
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
});

test('style rules: a line typed on Always files as a rule from the + beside it', async () => {
  const calls = mockFetch({
    'GET /me/dna': styleDna(),
    'POST /me/dna/lines': () =>
      styleDna({ brief: { ...styleDna().brief, rules: [kept('rules', 'Sleeves to the wrist')] } }),
  });
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${twin.dnaPage.styleRules}, Not yet` }),
  );
  await fireEvent.changeText(screen.getByLabelText(twin.words.first), 'Sleeves to the wrist');
  await fireEvent.press(screen.getByRole('button', { name: twin.words.add }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      list: 'rules',
      text: 'Sleeves to the wrist',
    }),
  );
});

test('observations: Robes reads when due, then Keep files a line and toasts', async () => {
  let read = false;
  const notice = {
    id: NOTICE_ID,
    list: 'loves' as const,
    text: 'You reach for a defined waist',
    because: 'your belted coats',
    origin: 'read' as const,
  };
  const calls = mockFetch({
    'GET /me/dna': () =>
      read ? styleDna({ observations: [notice] }) : styleDna({ readAt: null, readDue: true }),
    'POST /me/dna/read': { jobId: JOB_ID, status: 'queued' },
    [`GET /jobs/${JOB_ID}`]: () => {
      read = true;
      return {
        id: JOB_ID,
        kind: 'style_brief',
        status: 'succeeded',
        stage: 'done',
        output: { lines: 1 },
        error: null,
        cancelRequested: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        finishedAt: '2026-10-01T10:00:00.000Z',
      };
    },
    [`POST /me/dna/observations/${NOTICE_ID}/keep`]: styleDna({
      brief: {
        ...styleDna().brief,
        loves: [{ ...kept('loves', notice.text), id: NOTICE_ID, source: 'drafted' }],
      },
    }),
  });
  await renderWithApi(<Observations />);
  expect(await screen.findByText(asSentence(notice.text), {}, { timeout: 5000 })).toBeTruthy();
  expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/me/dna/read'))).toBe(true);
  await fireEvent.press(
    screen.getByRole('button', {
      name: twin.observations.answer(twin.observations.keep, notice.text),
    }),
  );
  expect(await screen.findByText(twin.noticed.kept)).toBeTruthy();
  expect(await screen.findByText(twin.observations.keptBefore)).toBeTruthy();
});

test('Observations: × takes a kept line off her Style DNA', async () => {
  const line = { ...kept('loves', 'You reach for a defined waist'), source: 'drafted' as const };
  const calls = mockFetch({
    'GET /me/dna': styleDna({ brief: { ...styleDna().brief, loves: [line] } }),
    [`DELETE /me/dna/lines/${LINE_ID}`]: styleDna(),
  });
  await renderWithApi(<Observations />);
  expect(await screen.findByText(twin.observations.empty)).toBeTruthy();
  await fireEvent.press(
    await screen.findByRole('button', { name: twin.observations.remove(line.text) }),
  );
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith(LINE_ID))).toBe(true),
  );
  expect(await screen.findByText(twin.observations.removed)).toBeTruthy();
});
