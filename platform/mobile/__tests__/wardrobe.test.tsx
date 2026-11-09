import { filters, ui, wardrobe, you } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PieceDetail } from '../src/features/wardrobe/PieceDetail';
import { WardrobeView } from '../src/features/wardrobe/WardrobeView';
import { errorReply, ME, mockFetch, renderWithApi } from './support/api';
import { PIECE_ID, piece } from './support/fixtures';
import { mockParams, mockRouter } from './support/router';

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

test('an empty wardrobe invites her to add pieces: the Add pieces sheet, its three tiles', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /wardrobe/items': { items: [], nextCursor: null },
    'GET /inbox': { items: [], count: 2, counts: { inbox: 2, added: 0, discarded: 0 } },
  });
  await renderWithApi(<WardrobeView />);
  expect(await screen.findByText(wardrobe.empty.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: `+ ${wardrobe.empty.action}` }));
  expect(await screen.findByTestId('add-pieces-sheet')).toBeTruthy();
  // From receipt carries the count waiting; Paste URL turns the sheet into Add from Link.
  expect(
    await screen.findByRole('button', { name: `${wardrobe.addSheet.fromReceipt}, 2` }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId('add-sheet-link'));
  expect(await screen.findByText(wardrobe.addSheet.linkTitle)).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('add-sheet-url'), 'https://shop.test/coat');
  await fireEvent.press(screen.getByTestId('add-sheet-read'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/wardrobe/link',
    params: { to: 'wardrobe', url: 'https://shop.test/coat' },
  });
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

test('each fact is its own drawer: a brand saves and the PIECE row shows it at once', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ brand: null }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ brand: 'Toteme' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  // The PIECE tab leads (PRD rev 3 §7.3): Name, Category, Brand, Size, Price, Notes.
  expect(await screen.findByRole('tab', { name: wardrobe.piece.tabs.piece })).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: `${wardrobe.piece.brand}: ${wardrobe.piece.add}` }),
  );
  await fireEvent.changeText(screen.getByLabelText(wardrobe.piece.brand), 'Toteme');
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.saveField }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ brand: 'Toteme' });
  expect(await screen.findByText('Toteme')).toBeTruthy();
});

test('COLOUR and WEARING hold their rows; Worn opens the record; Delete piece asks first', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ wearCount: 2 }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: {
      items: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
          wornOn: '2026-10-27',
          lookId: null,
          lookName: 'Office',
        },
      ],
      undated: 0,
    },
    [`DELETE /wardrobe/items/${PIECE_ID}`]: { ok: true },
    'GET /looks': { items: [], nextCursor: null },
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  // The colour rows wait on their tab.
  expect(await screen.findByRole('tab', { name: wardrobe.piece.tabs.colour })).toBeTruthy();
  expect(screen.queryByText(wardrobe.piece.rows.material)).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: wardrobe.piece.tabs.colour }));
  expect(screen.getByText(wardrobe.piece.rows.material)).toBeTruthy();
  // WEARING: Worn reads the count and the last day, Seasons the four seasons filed.
  await fireEvent.press(screen.getByRole('tab', { name: wardrobe.piece.tabs.wearing }));
  expect(await screen.findByText('2 times · last 27 Oct')).toBeTruthy();
  expect(screen.getByText('Autumn · Winter')).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.worn}: 2 times · last 27 Oct` }),
  );
  expect(await screen.findByText('Office')).toBeTruthy();
  // Delete piece (R14): the dialog asks; Cancel keeps it, Delete lets it go and leaves.
  await fireEvent.press(screen.getByTestId('delete-piece'));
  expect(await screen.findByText(wardrobe.piece.deleteTitle)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.cancel }));
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  await fireEvent.press(screen.getByTestId('delete-piece'));
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.piece.deleteConfirm }));
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
});

test('Seasons are the four seasons, each tap the answer; none filed reads Year round', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ seasons: [], seasonBand: 'year_round' }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ seasons: ['spring'] }),
    'GET /looks': { items: [], nextCursor: null },
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.wearing }));
  await fireEvent.press(
    screen.getByRole('button', {
      name: `${wardrobe.piece.rows.season}: ${wardrobe.filter.seasons.year_round}`,
    }),
  );
  await fireEvent.press(await screen.findByRole('checkbox', { name: filters.seasons.spring }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ seasons: ['spring'] });
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
  // It opens where the piece already sits (Outerwear › Coats): the family is the eyebrow over
  // the level, "Just coats" leads in the serif and carries the check; back walks out a level.
  expect(screen.getByRole('header', { name: 'Coats' })).toBeTruthy();
  expect(screen.getByText('Outerwear')).toBeTruthy();
  expect(
    screen.getByRole('button', { name: wardrobe.piece.taxonomy.justThis('Coats') }).props
      .accessibilityState,
  ).toMatchObject({ selected: true });
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.fields.back('Outerwear') }));
  await fireEvent.press(
    screen.getByRole('button', { name: wardrobe.fields.back(wardrobe.piece.rows.category) }),
  );
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
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.wearing }));
  await fireEvent.press(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.wearFor}: Everyday` }),
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
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.colour }));
  // The fixture is filed as Camel, so the row says so.
  await fireEvent.press(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.colour}: Camel` }),
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

test('a brand Robes named from the design marks Check on the Brand row', async () => {
  mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ brand: 'Sézane', brandCheck: true }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  expect(
    await screen.findByRole('button', {
      name: `${wardrobe.piece.brand}: Sézane. ${wardrobe.piece.brandCheck}`,
    }),
  ).toBeTruthy();
});

test('material is a row of Colour & material: the read marks Check, a pick answers it', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ material: 'wool', materialCheck: true }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ material: 'denim' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.colour }));
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
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.colour }));
  await fireEvent.press(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.material}: Silk` }),
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
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.colour }));
  await fireEvent.press(
    screen.getByRole('button', {
      name: `${wardrobe.piece.rows.material}: ${wardrobe.piece.add}`,
    }),
  );
  expect(screen.getByRole('radio', { name: 'Cotton' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: wardrobe.material.notSure })).toBeNull();
});

test('an empty row offers a hint, not "Add"; a long category keeps its label whole', async () => {
  mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({
      brand: null,
      categoryL2: 'Jumpers & sweaters',
      categoryL3: 'Crew neck jumper',
      notes: 'Runs small.',
    }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  // The leaf of the category, not its path.
  expect(
    await screen.findByRole('button', {
      name: `${wardrobe.piece.rows.category}: Crew neck jumper`,
    }),
  ).toBeTruthy();
  expect(screen.getByText(wardrobe.fields.hints.brand)).toBeTruthy();
  expect(screen.getAllByText(wardrobe.fields.hints.optional).length).toBeGreaterThan(0);
  expect(screen.queryByText(wardrobe.piece.add)).toBeNull();
  // A filled note prints beneath; the row says Edit, and a reader hears the note.
  expect(screen.getByText(wardrobe.fields.edit)).toBeTruthy();
  expect(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.notes}: Runs small.` }),
  ).toBeTruthy();
  const label = screen.getByText(wardrobe.piece.rows.category);
  expect(label.props.numberOfLines).toBe(1);
  expect(label.props.style).toEqual(expect.arrayContaining([{ flexShrink: 0 }]));
});

test('a typed field waits for a change: Save is off until the brand has words', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ brand: null }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ brand: 'Toteme' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${wardrobe.piece.brand}: ${wardrobe.piece.add}`,
    }),
  );
  const save = () => screen.getByRole('button', { name: wardrobe.piece.saveField });
  expect(save().props.accessibilityState.disabled).toBe(true);
  // No eyebrow repeats the title, and the sheet closes from its own ×.
  expect(screen.getAllByText(wardrobe.piece.brand)).toHaveLength(2);
  expect(screen.getByPlaceholderText(wardrobe.fields.brand.placeholder)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(wardrobe.piece.brand), 'Toteme');
  expect(save().props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(save());
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ brand: 'Toteme' });
});

test('a price is filed with its currency, read from the chips', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ price: null, currency: null }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ price: 89.99, currency: 'GBP' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', {
      name: `${wardrobe.piece.rows.price}: ${wardrobe.piece.add}`,
    }),
  );
  expect(screen.getByText(wardrobe.fields.price.helper)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('button', { name: wardrobe.fields.price.chip('£', 'GBP') }),
  );
  await fireEvent.changeText(screen.getByLabelText(wardrobe.piece.rows.price), '89,99');
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.saveField }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ price: 89.99, currency: 'GBP' });
});

test('a size steps along the category’s scale, with the conversion beside it', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece({ size: 'UK 12' }),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ size: 'UK 14' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${wardrobe.piece.rows.size}: UK 12` }),
  );
  expect(screen.getByText(wardrobe.fields.size.conversion(40, 8))).toBeTruthy();
  expect(
    screen.getByRole('button', { name: wardrobe.piece.saveField }).props.accessibilityState
      .disabled,
  ).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.fields.size.up }));
  expect(screen.getByText('UK 14')).toBeTruthy();
  expect(screen.getByText(wardrobe.fields.size.conversion(42, 10))).toBeTruthy();
  expect(screen.getByRole('button', { name: wardrobe.fields.size.notSure })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.saveField }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ size: 'UK 14' });
});

test('a print is a list with its own drawn square; a pick saves', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ print: 'stripes' }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.colour }));
  await fireEvent.press(
    screen.getByRole('button', {
      name: `${wardrobe.piece.rows.print}: ${wardrobe.colour.plain}`,
    }),
  );
  expect(
    screen.getByRole('radio', { name: wardrobe.colour.plain }).props.accessibilityState,
  ).toMatchObject({ checked: true });
  expect(screen.getByTestId('print-swatch-stripes')).toBeTruthy();
  expect(screen.queryByRole('button', { name: wardrobe.piece.done })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: 'Stripes' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ print: 'stripes' });
});

test('her own wear tag is added from "+ Your own" and picked at once', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`GET /wardrobe/items/${PIECE_ID}/wears`]: { items: [], undated: 0 },
    [`PATCH /wardrobe/items/${PIECE_ID}`]: piece({ wearFor: ['Everyday', 'Weekend casual'] }),
    'GET /wardrobe/items': { items: [], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  await fireEvent.press(await screen.findByRole('tab', { name: wardrobe.piece.tabs.wearing }));
  await fireEvent.press(
    screen.getByRole('button', { name: `${wardrobe.piece.rows.wearFor}: Everyday` }),
  );
  expect(screen.getByText(wardrobe.fields.wearFor.helper)).toBeTruthy();
  // Done sits in the header; there is no ×.
  expect(screen.getByRole('button', { name: wardrobe.piece.done })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.fields.wearFor.own }));
  await fireEvent.changeText(
    screen.getByLabelText(wardrobe.fields.wearFor.ownLabel),
    'Weekend casual',
  );
  await fireEvent(screen.getByLabelText(wardrobe.fields.wearFor.ownLabel), 'submitEditing');
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
    wearFor: ['Everyday', 'Weekend casual'],
  });
  expect(await screen.findByRole('button', { name: 'Weekend casual' })).toBeTruthy();
});

test('removing a piece goes back and offers Undo, which restores it', async () => {
  const calls = mockFetch({
    [`GET /wardrobe/items/${PIECE_ID}`]: piece(),
    [`DELETE /wardrobe/items/${PIECE_ID}`]: { ok: true },
    [`POST /wardrobe/items/${PIECE_ID}/restore`]: piece(),
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
  });
  await renderWithApi(<PieceDetail id={PIECE_ID} />);
  // Delete piece asks first (R14); Delete lets it go, and Undo still follows in the toast.
  await fireEvent.press(await screen.findByTestId('delete-piece'));
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.piece.deleteConfirm }));
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
  // Category · Brand is one quiet line; rose is kept for "Never worn".
  expect(screen.getByText(/ · Toteme$/)).toBeTruthy();

  await fireEvent.press(
    screen.getByRole('button', { name: wardrobe.card.star('Camel wool coat') }),
  );
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ hero: true });
  expect(await screen.findByText(wardrobe.card.starred)).toBeTruthy();

  await fireEvent.press(await screen.findByRole('button', { name: 'Accessories 1' }));
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

test('grid | list switches the layout; the list swipes (or acts) to Delete, asked first, with Undo', async () => {
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
  // The phone opens on the list, where a row carries Delete (R14: it asks, as the piece page does).
  const removeLabel = wardrobe.deletePiece('Camel wool coat');
  expect(await screen.findByRole('button', { name: removeLabel })).toBeTruthy();
  expect(screen.getByText(wardrobe.card.swipeDelete)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.header.grid }));
  expect(screen.queryByRole('button', { name: removeLabel })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: wardrobe.header.list }));
  // Cancel keeps the piece.
  await fireEvent(screen.getByRole('button', { name: removeLabel }), 'press');
  expect(await screen.findByText(wardrobe.piece.deleteTitle)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.piece.cancel }));
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  await fireEvent(screen.getByRole('button', { name: removeLabel }), 'press');
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.piece.deleteConfirm }));
  expect(await screen.findByText(wardrobe.deleted)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  expect(screen.queryByText('Camel wool coat')).toBeNull();
  expect(await screen.findByText(wardrobe.empty.title)).toBeTruthy();
});

test('the filter sheet applies live: a colour family and a season narrow the grid; Clear undoes them', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/summary': {
      total: 1,
      categories: [{ category: 'Outerwear', count: 1 }],
      brands: [],
      wearFor: [],
    },
    'GET /wardrobe/items': (_: RequestInit, url: string) =>
      url.includes('seasons=spring')
        ? { items: [], nextCursor: null, total: 0 }
        : { items: [piece()], nextCursor: null, total: 1 },
  });
  await renderWithApi(<WardrobeView />);
  await fireEvent.press(await screen.findByRole('button', { name: ui.filter }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Neutrals' }));
  await waitFor(() =>
    expect(calls.some((c) => c.url.includes('colourFamilies=neutrals'))).toBe(true),
  );
  await fireEvent.press(await screen.findByRole('button', { name: filters.seasons.spring }));
  await waitFor(() => expect(calls.some((c) => c.url.includes('seasons=spring'))).toBe(true));
  // The one button reads what the filters leave, and closes the sheet.
  await fireEvent.press(await screen.findByRole('button', { name: filters.showPieces(0) }));
  expect(await screen.findByText(wardrobe.filter.nothing)).toBeTruthy();
  // Two filters on: the Filter button says so.
  expect(screen.getByRole('button', { name: `${ui.filter} 2` })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.filter.showEverything }));
  expect(await screen.findByText('Camel wool coat')).toBeTruthy();
});

test('the filter sheet refines by what she wears it for and by one brand from the select', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'GET /wardrobe/summary': {
      total: 1,
      categories: [{ category: 'Outerwear', count: 1 }],
      brands: ['Toteme'],
      wearFor: ['Skiing'],
    },
    'GET /wardrobe/items': { items: [piece()], nextCursor: null, total: 1 },
  });
  await renderWithApi(<WardrobeView />);
  await fireEvent.press(await screen.findByRole('button', { name: ui.filter }));
  expect(await screen.findByText(filters.wearFor)).toBeTruthy();
  // The shared list leads (Weekend among it), then her own tag.
  expect(screen.getByRole('button', { name: 'Weekend' })).toBeTruthy();
  await fireEvent.press(await screen.findByRole('button', { name: 'Skiing' }));
  await fireEvent.press(screen.getByRole('button', { name: wardrobe.filter.brand }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Toteme' }));
  await waitFor(() =>
    expect(
      calls.some((c) => c.url.includes('wearFor=Skiing') && c.url.includes('brand=Toteme')),
    ).toBe(true),
  );
  // The chips count under the sheet's picks: the summary is asked with them, the category aside.
  await waitFor(() =>
    expect(
      calls.some((c) => c.path.endsWith('/wardrobe/summary') && c.url.includes('brand=Toteme')),
    ).toBe(true),
  );
});

test('Owned · Wishlist · Shop, and no receipt card on the page while a receipt waits', async () => {
  const entry = {
    id: '00000000-0000-4000-8000-0000000000e1',
    source: 'receipt',
    retailer: 'Zara',
    subject: null,
    receivedAt: '2026-10-01T09:00:00.000Z',
    items: [
      { index: 0, label: 'Wool coat', brand: null, price: null, currency: null, sourceUrl: null },
      { index: 1, label: 'Silk scarf', brand: null, price: null, currency: null, sourceUrl: null },
    ],
  };
  mockFetch({
    'GET /me': ME,
    'GET /wardrobe/summary': {
      total: 2,
      categories: [
        { category: 'Outerwear', count: 1 },
        { category: 'Other', count: 1 },
      ],
    },
    'GET /wardrobe/items': { items: [piece()], nextCursor: null, total: 2 },
    'GET /inbox': { items: [entry], count: 2 },
  });
  await renderWithApi(<WardrobeView />);
  expect(await screen.findByText('2 pieces')).toBeTruthy();
  // Owned · Wishlist · Shop (Front Door PRD rev 3 §7.1): Shop stands disabled; no Inbox tab.
  const tabs = screen.getAllByRole('tab').map((r) => r.props.accessibilityLabel);
  expect(tabs).toEqual([
    wardrobe.segments.owned,
    wardrobe.segments.wishlist,
    wardrobe.segments.shop,
  ]);
  expect(
    screen.getByRole('tab', { name: wardrobe.segments.shop }).props.accessibilityState.disabled,
  ).toBe(true);
  // The category chips carry their counts; "Other" isn't a chip, its pieces stay under All.
  expect(screen.getByRole('button', { name: 'Outerwear 1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: `${filters.all} 2` })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Other/ })).toBeNull();

  // Waiting receipts are the bell's news, never a card on the page (Annie, 9 Nov).
  expect(screen.queryByText(you.receipts.review(2))).toBeNull();
});

test('an old Inbox link opens the Inbox', async () => {
  mockFetch({
    'GET /me': ME,
    'GET /wardrobe/summary': { total: 1, categories: [{ category: 'Outerwear', count: 1 }] },
    'GET /wardrobe/items': { items: [piece()], nextCursor: null, total: 1 },
    'GET /inbox': { items: [], count: 0 },
  });
  mockParams.segment = 'inbox';
  try {
    await renderWithApi(<WardrobeView />);
    expect(await screen.findByText('1 piece')).toBeTruthy();
    expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe/inbox');
  } finally {
    delete mockParams.segment;
  }
});
