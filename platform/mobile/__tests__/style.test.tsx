import { twin, you } from '@robes/copy';
import { asSentence } from '@robes/core';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Observations } from '../src/features/you/Observations';
import { StyleDna } from '../src/features/you/StyleDna';
import { mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LINE_ID, NOTICE_ID, styleDna } from './support/fixtures';

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

test('Style DNA: a type, a brand from the wall and the investment level save at once', async () => {
  const calls = mockFetch({ 'GET /me/dna': styleDna(), 'PATCH /me/dna': patchEcho });
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${twin.dnaPage.styleType}, ${twin.dnaPage.notYet}`,
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Minimal' }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ types: ['Minimal'] }),
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Minimal' }).props.accessibilityState).toMatchObject({
      selected: true,
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
    await screen.findByRole('button', { name: `${copy.coloursTitle}, ${copy.summary(0, 0)}` }),
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

test('the brand wall adds a house that is not in the pool', async () => {
  const calls = mockFetch({ 'GET /me/dna': styleDna(), 'PATCH /me/dna': patchEcho });
  await renderWithApi(<StyleDna />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${twin.dnaPage.brands}, ${twin.dnaPage.notYet}` }),
  );
  await fireEvent.changeText(screen.getByLabelText(twin.wall.searchBrands), 'Atelier Nouveau');
  await fireEvent.press(screen.getByRole('button', { name: twin.wall.add('Atelier Nouveau') }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
      brands: ['Atelier Nouveau'],
    }),
  );
});

test('a hard-no chip files the line with its chip; a second tap strikes it', async () => {
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
    await screen.findByRole('button', { name: `${twin.dnaPage.avoids}, Not yet` }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Heels' }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      list: 'avoids',
      text: 'Heels',
      chip: 'Heels',
    }),
  );
  expect(await screen.findByRole('button', { name: twin.words.strike('Heels') })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Heels' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
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
