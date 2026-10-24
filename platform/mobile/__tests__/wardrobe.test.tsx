import { wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PieceDetail } from '../src/features/wardrobe/PieceDetail';
import { WardrobeView } from '../src/features/wardrobe/WardrobeView';
import { errorReply, ME, mockFetch, renderWithApi } from './support/api';
import { PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

test('the grid lists pieces, pages with the cursor and opens a piece', async () => {
  const second = piece({ id: '77777777-7777-4777-8777-777777777777', label: 'Silk scarf' });
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/items': (_: RequestInit, url: string) =>
      url.includes('cursor=next')
        ? { items: [second], nextCursor: null }
        : { items: [piece()], nextCursor: 'next' },
  });
  await renderWithApi(<WardrobeView />);
  expect(await screen.findByText('Camel wool coat')).toBeTruthy();
  await fireEvent(screen.getByTestId('pieces-list'), 'onEndReached');
  expect(await screen.findByText('Silk scarf')).toBeTruthy();
  expect(calls.filter((c) => c.path.endsWith('/wardrobe/items'))).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: 'Camel wool coat' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/piece/${PIECE_ID}`);
});

test('an empty wardrobe invites her to add pieces', async () => {
  mockFetch({ 'GET /me': ME, 'GET /wardrobe/items': { items: [], nextCursor: null } });
  await renderWithApi(<WardrobeView />);
  expect(await screen.findByText(wardrobe.empty.title)).toBeTruthy();
  expect(screen.getByRole('button', { name: wardrobe.empty.action })).toBeTruthy();
});

test('a reading piece says so and offers no styling yet', async () => {
  mockFetch({ [`GET /wardrobe/items/${PIECE_ID}`]: piece({ status: 'reading', image: null }) });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  expect(await screen.findByText(wardrobe.reading)).toBeTruthy();
  expect(
    screen.getByRole('button', { name: wardrobe.piece.stylePiece }).props.accessibilityState
      .disabled,
  ).toBe(true);
});

test('each fact is its own drawer: a brand saves and shows under the name at once', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ brand: null }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ brand: 'Toteme' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  // The line under the name is the door, and it says what is missing.
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.piece.addBrand }));
  await fireEvent.changeText(screen.getByLabelText(wardrobe.piece.brand), 'Toteme');
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.saveField }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ brand: 'Toteme' });
  // The line under the name and the row read the same saved piece, so both say it.
  expect(await screen.findAllByText('Toteme')).toHaveLength(2);
});

test('the category drills Category › Subcategory › Item type and files the legacy column', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece(),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${wardrobe.piece.rows.category}: ${piece().categoryL2}`,
    }),
  );
  // It opens where the piece already sits (Outerwear › Coats); back walks out to the categories.
  await fireEvent.press(screen.getByRole('button', { name: '‹ Outerwear' }));
  await fireEvent.press(screen.getByRole('button', { name: `‹ ${wardrobe.piece.rows.category}` }));
  await fireEvent.press(screen.getByRole('button', { name: 'Tops' }));
  await fireEvent.press(screen.getByRole('button', { name: 'T-shirts & tees' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Crew neck t-shirt' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
    categoryL2: 'T-shirts & tees',
    categoryL3: 'Crew neck t-shirt',
  });
});

test('wear it for is hers to set, and each tap is the answer', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ wearFor: ['Everyday', 'Work'] }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${wardrobe.piece.rows.wearFor}: Everyday` }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Work' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  // The tags ride into the prompt when a look is built around the piece, so they are the write.
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
    wearFor: ['Everyday', 'Work'],
  });
});

test('a colour answers on the tap, from the family tiles and their shades', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ colourShade: 'navy' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  // The fixture is filed as Camel, so the row says so.
  await fireEvent.press(
    await screen.findByRole('button', { name: `${wardrobe.piece.rows.colour}: Camel` }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Blues' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Navy' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  // Picking IS the answer: no second step, and the print is a separate row.
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
    colourShade: 'navy',
    colourExtra: [],
  });
});

test('material is a row of Colour & material: the read marks Check, a pick answers it', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ material: 'wool', materialCheck: true }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ material: 'denim' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  expect(await screen.findByText(wardrobe.piece.sections.colour)).toBeTruthy();
  // Robes was unsure, so the row says so until she answers it.
  const row = await screen.findByRole('button', {
    name: `${wardrobe.piece.rows.material}: Wool. ${wardrobe.material.check}`,
  });
  expect(screen.getByText(wardrobe.piece.check)).toBeTruthy();
  await fireEvent.press(row);
  // The sheet opens on the family of what is filed, with that material checked.
  expect(screen.getByRole('radio', { name: 'Wool' }).props.accessibilityState).toMatchObject({
    checked: true,
  });
  expect(screen.getByRole('button', { name: wardrobe.material.notSure })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cloths' }));
  // Natural holds her material while she looks at Cloths, so it carries the dot.
  expect(screen.getByTestId('material-home-natural')).toBeTruthy();
  expect(screen.getByText('Sequins & glitter')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Denim' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ material: 'denim' });
});

test('"Not sure" files no material', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ material: 'silk' }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ material: null }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${wardrobe.piece.rows.material}: Silk` }),
  );
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.material.notSure }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ material: null });
});

test('an unfiled material reads as the door, and its sheet opens on Natural', async () => {
  mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${wardrobe.piece.rows.material}: ${wardrobe.piece.add}`,
    }),
  );
  expect(screen.getByRole('radio', { name: 'Cotton' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: wardrobe.material.notSure })).toBeNull();
});

test('removing a piece goes back and offers Undo, which restores it', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`DELETE /wardrobe/items/${PIECE_ID}`]: { ok: true },
    [`POST /wardrobe/items/${PIECE_ID}/restore`]: piece(),
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.piece.remove }));
  expect(mockRouter.back).toHaveBeenCalled();
  expect(await screen.findByText(wardrobe.deleted)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: wardrobe.undo }));
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

const SCARF_ID = '77777777-7777-4777-8777-777777777777';

test('the list is the rack card: eyebrow, status line, the star, and the count row', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/summary': {
      total: 2,
      categories: [
        { category: 'Outerwear', count: 1 },
        { category: 'Accessories', count: 1 },
      ],
    },
    'GET /wardrobe/items': (_: RequestInit, url: string) =>
      url.includes('category=Accessories')
        ? {
            items: [
              piece({
                id: SCARF_ID,
                label: 'Silk scarf',
                category: 'Accessories',
                categoryL2: null,
              }),
            ],
            nextCursor: null,
            total: 1,
          }
        : {
            items: [
              piece({ brand: 'Toteme', wearCount: 6 }),
              piece({
                id: SCARF_ID,
                label: 'Silk scarf',
                category: 'Accessories',
                categoryL2: null,
              }),
            ],
            nextCursor: null,
            total: 2,
          },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ brand: 'Toteme', heroPosition: 1 }),
  });
  await renderWithApi(<WardrobeView />);
  expect(await screen.findByText('2 pieces')).toBeTruthy();
  expect(screen.getByText('Worn 6×')).toBeTruthy();
  expect(screen.getByText(wardrobe.card.neverWorn)).toBeTruthy();
  expect(screen.getByText(' · Toteme')).toBeTruthy();

  await fireEvent.press(
    screen.getByRole('button', { name: wardrobe.card.star('Camel wool coat') }),
  );
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ hero: true });
  expect(await screen.findByText(wardrobe.card.starred)).toBeTruthy();

  await fireEvent.press(await screen.findByRole('button', { name: 'Accessories' }));
  expect(await screen.findByText('1 piece')).toBeTruthy();
  expect(calls.some((c) => c.url.includes('category=Accessories'))).toBe(true);
});

test('a full Hero Rack says so', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /wardrobe/items': { items: [piece()], nextCursor: null, total: 1 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: errorReply(409, 'conflict'),
  });
  await renderWithApi(<WardrobeView />);
  await fireEvent.press(
    await screen.findByRole('button', { name: wardrobe.card.star('Camel wool coat') }),
  );
  expect(await screen.findByText(wardrobe.card.heroFull)).toBeTruthy();
});

test('grid | list switches the layout; the list swipes (or acts) to remove with Undo', async () => {
  let gone = false;
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/items': () =>
      gone
        ? { items: [], nextCursor: null, total: 0 }
        : { items: [piece()], nextCursor: null, total: 1 },
    [`DELETE /wardrobe/items/${PIECE_ID}`]: () => {
      gone = true;
      return { ok: true };
    },
  });
  await renderWithApi(<WardrobeView />);
  // The phone opens on the list, where a row carries Remove.
  const removeLabel = wardrobe.removePiece('Camel wool coat');
  expect(await screen.findByRole('button', { name: removeLabel })).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.header.grid }));
  expect(screen.queryByRole('button', { name: removeLabel })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.header.list }));
  await fireEvent(screen.getByRole('button', { name: removeLabel }), 'press');
  expect(await screen.findByText(wardrobe.deleted)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  expect(screen.queryByText('Camel wool coat')).toBeNull();
  expect(await screen.findByText(wardrobe.empty.title)).toBeTruthy();
});

test('Filter counts the season and the colour family before she applies them', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/items': (_: RequestInit, url: string) =>
      url.includes('seasonBand=spring_summer')
        ? { items: [], nextCursor: null, total: 0 }
        : { items: [piece()], nextCursor: null, total: 1 },
  });
  await renderWithApi(<WardrobeView />);
  await fireEvent.press(await screen.findByTestId('wardrobe-filter'));
  await fireEvent.press(await screen.findByRole('button', { name: 'Neutrals' }));
  await waitFor(() =>
    expect(calls.some((c) => c.url.includes('colourFamily=neutrals'))).toBe(true),
  );
  await fireEvent.press(
    await screen.findByRole('button', { name: wardrobe.filter.seasons.spring_summer }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.filter.show(0) }));
  expect(await screen.findByText(wardrobe.filter.nothing)).toBeTruthy();
  expect(calls.some((c) => c.url.includes('seasonBand=spring_summer'))).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.filter.showEverything }));
  expect(await screen.findByText('Camel wool coat')).toBeTruthy();
});
