import { describe, expect, it } from 'vitest';
import {
  type AskEdit,
  anchorName,
  applyAsk,
  askDateFrom,
  askWhen,
  changedKeys,
  deckReduce,
  deckTop,
  emptyDeck,
  forecastWord,
  frameKey,
  isProposalKey,
  lookFacts,
  lookLine,
  lookMatches,
  lookWearFor,
  nameNoBrand,
  newProposalKey,
  noteShort,
  orderRack,
  pickerOrder,
  pieceNoun,
  type RackRow,
  type RackState,
  rackSignature,
  readBalance,
  rowNote,
  sortLooks,
  startedLabel,
  theName,
  wearForOptions,
} from './index';

const row = (key: string, name: string, role: RackRow['role'] = null): RackRow => ({
  key,
  pieceId: key,
  name,
  category: 'Tops',
  brand: null,
  role,
  proposal: null,
});

describe('copy helpers (legacy parity)', () => {
  it('caps a note at three sentences', () => {
    expect(noteShort('One. Two! Three? Four. Five.')).toBe('One. Two! Three?');
    expect(noteShort('  A late dinner,\n\n the jacket open  ')).toBe(
      'A late dinner, the jacket open',
    );
    expect(noteShort(null)).toBe('');
  });

  it('drops the brand from a name, never emptying it', () => {
    expect(nameNoBrand('Miu Miu ballet sneakers', 'Miu Miu')).toBe('Ballet sneakers');
    expect(nameNoBrand('Jumper by Wimbledon', 'Wimbledon')).toBe('Jumper');
    expect(nameNoBrand('Wimbledon jumper', 'Wimbledon')).toBe('Jumper');
    expect(nameNoBrand('Ganni', 'Ganni')).toBe('Ganni');
    expect(nameNoBrand('Silk shirt', null)).toBe('Silk shirt');
  });

  it('names a piece in a sentence', () => {
    expect(theName('Camel wool shacket')).toBe('the camel wool shacket');
    expect(theName('her black flats')).toBe('her black flats');
    expect(anchorName('Ganni rust slip dress', 'Ganni')).toBe('rust slip dress');
  });
});

describe('the rack', () => {
  it('orders rows by the formula, stable inside a role', () => {
    const rows = [
      row('a', 'Bag', 'exclamation'),
      row('b', 'Coat', 'anchor'),
      row('c', 'Tee', 'canvas'),
      row('d', 'Jeans', 'canvas'),
      row('e', 'Scarf', null),
    ];
    expect(orderRack(rows).map((r) => r.key)).toEqual(['c', 'd', 'b', 'a', 'e']);
  });

  it('mints proposal keys the server accepts', () => {
    const key = newProposalKey();
    expect(isProposalKey(key)).toBe(true);
    expect(isProposalKey('11111111-1111-4111-8111-111111111111')).toBe(false);
  });

  const base: RackState = {
    rows: [row('tee', 'Cream tee', 'canvas'), row('jeans', 'White wide-leg trouser', 'anchor')],
    edits: {},
    styling: {},
  };

  it('swaps a row for her piece and remembers the original', () => {
    const edit: AskEdit = {
      swaps: [
        {
          key: 'jeans',
          to: { pieceId: 'dark', name: 'Dark straight jean', category: 'Bottoms', brand: null },
        },
      ],
      back: [],
      styled: [],
    };
    const next = applyAsk(base, edit);
    expect(next.rows.map((r) => r.key)).toEqual(['tee', 'dark']);
    expect(next.rows[1]?.role).toBe('anchor');
    expect(rowNote(next, 'dark')).toEqual({ kind: 'was', name: 'White wide-leg trouser' });
    expect(changedKeys(next)).toEqual(['dark']);
  });

  it('a swap keeps the piece’s subcategory, so the rack’s eyebrow reads the sheet', () => {
    const next = applyAsk(base, {
      swaps: [
        {
          key: 'tee',
          to: {
            pieceId: 'knit',
            name: 'Grey jumper',
            category: 'Tops',
            categoryL2: 'Jumpers & sweaters',
            brand: 'COS',
          },
        },
      ],
      back: [],
      styled: [],
    });
    expect(next.rows[0]).toMatchObject({ key: 'knit', categoryL2: 'Jumpers & sweaters' });
    // A target without one (an older server) still lands, read from its stored category.
    const old = applyAsk(base, {
      swaps: [{ key: 'tee', to: { pieceId: 'old', name: 'Tee', category: 'Tops', brand: null } }],
      back: [],
      styled: [],
    });
    expect(old.rows[0]?.categoryL2).toBeNull();
  });

  it('a second change on a row keeps the first original; back restores it', () => {
    let s = applyAsk(base, {
      swaps: [
        {
          key: 'jeans',
          to: { pieceId: 'dark', name: 'Dark jean', category: 'Bottoms', brand: null },
        },
      ],
      back: [],
      styled: [],
    });
    s = applyAsk(
      s,
      {
        swaps: [
          {
            key: 'dark',
            to: {
              proposal: {
                name: 'Black cigarette trouser',
                category: 'Bottoms',
                color: 'black',
                brand: 'Toteme',
                retailerHint: 'toteme.com',
                pricePoint: '€290',
              },
            },
          },
        ],
        back: [],
        styled: [],
      },
      () => 'p-abcd1234',
    );
    expect(s.rows[1]).toMatchObject({ key: 'p-abcd1234', pieceId: null, role: 'anchor' });
    expect(s.rows[1]?.proposal).toMatchObject({ brand: 'Toteme', wishlisted: false });
    expect(rowNote(s, 'p-abcd1234')).toEqual({ kind: 'was', name: 'White wide-leg trouser' });

    const back = applyAsk(s, { swaps: [], back: [], backAll: true, styled: [] });
    expect(back.rows.map((r) => r.key)).toEqual(['tee', 'jeans']);
    expect(rowNote(back, 'jeans')).toEqual({ kind: 'back' });
    expect(changedKeys(back)).toEqual([]);
  });

  it('never puts the same piece on twice, and keeps styling per row', () => {
    const s = applyAsk(base, {
      swaps: [
        { key: 'jeans', to: { pieceId: 'tee', name: 'Cream tee', category: 'Tops', brand: null } },
      ],
      back: [],
      styled: [
        { key: 'tee', note: 'tucked at the front' },
        { key: 'nope', note: 'x' },
      ],
    });
    expect(s.rows.map((r) => r.key)).toEqual(['tee', 'jeans']);
    expect(s.styling).toEqual({ tee: 'tucked at the front' });
    expect(rackSignature(s)).toBe('jeans;tee~tucked at the front');
  });
});

describe('a day read out of her words', () => {
  // 2026-10-15 is a Thursday.
  const today = '2026-10-15';
  it.each([
    ['dinner tonight', '2026-10-15'],
    ['what to wear tomorrow', '2026-10-16'],
    ['Style me for dinner on saturday night', '2026-10-17'],
    ['thursday lunch', '2026-10-15'],
    ['next friday', '2026-10-23'],
    ['the weekend', '2026-10-17'],
    ['next week', '2026-10-19'],
    ['17 Oct', '2026-10-17'],
    ['October 30th', '2026-10-30'],
    ['2 jan', '2027-01-02'],
    ['2026-11-01', '2026-11-01'],
  ])('%s → %s', (text, iso) => expect(askDateFrom(text, today)).toBe(iso));

  it('places nothing it cannot read, and never a day gone by', () => {
    expect(askDateFrom('something chic', today)).toBeNull();
    expect(askDateFrom('sat brunch', today)).toBeNull();
    expect(askDateFrom('1 Oct', today)).toBeNull();
    expect(askDateFrom('2026-10-01', today)).toBeNull();
  });

  it('says when, and reads the forecast', () => {
    expect(askWhen('2026-10-16', today)).toEqual({ kind: 'tomorrow' });
    expect(askWhen('2026-10-17', today)).toEqual({ kind: 'weekday', weekday: 6 });
    expect(askWhen('2026-10-23', today)).toEqual({ kind: 'next', weekday: 5 });
    expect(askWhen('2026-11-30', today)).toEqual({ kind: 'date', iso: '2026-11-30' });
    expect(forecastWord({ code: 61, tmax: 14 })).toBe('raining');
    expect(forecastWord({ code: 0, tmax: 27 })).toBe('hot');
    expect(forecastWord({ code: 3, tmax: 8 })).toBe('cold');
    expect(forecastWord({ code: 1, tmax: 19 })).toBe('sunny');
    expect(forecastWord({ code: 3, tmax: 14 })).toBe('cool');
    expect(forecastWord({ code: 3, tmax: 18 })).toBe('mild');
  });
});

describe('keep or pass', () => {
  it('lands looks behind the top card, keeps, passes and undoes a pass', () => {
    let d = deckReduce(emptyDeck(), { type: 'land', ids: ['a'] });
    d = deckReduce(d, { type: 'land', ids: ['a', 'b', 'c'] });
    expect(d.order).toEqual(['a', 'b', 'c']);
    d = deckReduce(d, { type: 'keep', id: 'a' });
    d = deckReduce(d, { type: 'pass', id: 'b' });
    expect(deckTop(d)).toBe('c');
    d = deckReduce(d, { type: 'undo', id: 'b' });
    expect(deckTop(d)).toBe('b');
    expect(d.passed).toEqual([]);
    expect(deckReduce(d, { type: 'keep', id: 'c' })).toBe(d);
    d = deckReduce(deckReduce(d, { type: 'keep', id: 'b' }), { type: 'keep', id: 'c' });
    expect(d.kept).toEqual(['a', 'b', 'c']);
    expect(deckTop(d)).toBeNull();
  });
});

describe('the frame key', () => {
  it('is order-free and changes with the rack or how a piece is worn', () => {
    const a = frameKey(['x', 'y'], [{ name: 'Mules', brand: 'Toteme' }], {});
    expect(frameKey(['y', 'x'], [{ name: 'Mules', brand: 'Toteme' }], {})).toBe(a);
    expect(frameKey(['x'], [{ name: 'Mules', brand: 'Toteme' }], {})).not.toBe(a);
    expect(frameKey(['x', 'y'], [{ name: 'Mules', brand: 'Toteme' }], { x: 'tucked' })).not.toBe(a);
    expect(a).toMatch(/^[0-9a-z]{14}$/);
  });
});

describe('a draft’s started line', () => {
  it('reads today, a weekday, or the date', () => {
    expect(startedLabel('2026-10-15T09:00:00Z', '2026-10-15', 'UTC')).toBe('today');
    expect(startedLabel('2026-10-13T09:00:00Z', '2026-10-15', 'UTC')).toBe('Tuesday');
    expect(startedLabel('2026-10-01T09:00:00Z', '2026-10-15', 'UTC')).toBe('1 Oct');
  });
});

describe('the Saved tab’s sort', () => {
  const a = { name: 'Brunch', createdAt: '2026-10-01T00:00:00Z', lastWornOn: '2026-10-10' };
  const b = { name: 'Archive', createdAt: '2026-10-05T00:00:00Z', lastWornOn: null };
  const c = { name: 'Cocktails', createdAt: '2026-10-03T00:00:00Z', lastWornOn: '2026-10-12' };
  it('sorts newest, last worn and by name', () => {
    expect(sortLooks([a, b, c], 'newest').map((l) => l.name)).toEqual([
      'Archive',
      'Cocktails',
      'Brunch',
    ]);
    expect(sortLooks([a, b, c], 'lastWorn').map((l) => l.name)).toEqual([
      'Cocktails',
      'Brunch',
      'Archive',
    ]);
    expect(sortLooks([a, b, c], 'name').map((l) => l.name)).toEqual([
      'Archive',
      'Brunch',
      'Cocktails',
    ]);
  });
});

describe('pieceNoun', () => {
  it('reads the last word of the name, plural when it ends in a plain s', () => {
    expect(pieceNoun('Light wash wide-leg jeans')).toEqual({ word: 'jeans', plural: true });
    expect(pieceNoun('Acid green cropped jumper')).toEqual({ word: 'jumper', plural: false });
    expect(pieceNoun('Silk dress')).toEqual({ word: 'dress', plural: false });
    expect(pieceNoun('Cream long-sleeve t-shirt')).toEqual({ word: 't-shirt', plural: false });
  });
  it('falls back to this piece when the name tells nothing', () => {
    expect(pieceNoun('')).toEqual({ word: 'piece', plural: false });
    expect(pieceNoun(null)).toEqual({ word: 'piece', plural: false });
    expect(pieceNoun('New')).toEqual({ word: 'piece', plural: false });
  });
});

describe('readBalance', () => {
  it.each([
    ['just my own pieces', 'owned'],
    ['All mine', 'owned'],
    ['nothing new please', 'owned'],
    ['mostly mine', 'mix'],
    ['a mix of both', 'mix'],
    ['new pieces please', 'new'],
    ['suggest something fresh', 'new'],
  ])('%s → %s', (text, balance) => {
    expect(readBalance(text)).toEqual({ balance, note: null });
  });

  it('keeps words it cannot place as her note, capped', () => {
    expect(readBalance('  whatever suits the brunch  ')).toEqual({
      balance: null,
      note: 'whatever suits the brunch',
    });
    expect(readBalance('x'.repeat(400)).note).toHaveLength(160);
    expect(readBalance('   ')).toEqual({ balance: null, note: null });
  });
});

describe('lookFacts', () => {
  const look = {
    timesWorn: 3,
    lastWornOn: '2026-07-23',
    anchor: { label: 'Rust slip dress', brand: 'Ganni' },
  };

  it('reads the rack, the wears, the day and the piece it was styled around', () => {
    expect(lookFacts(look, 4)).toEqual({
      pieces: 4,
      timesWorn: 3,
      lastWorn: '23 Jul',
      around: 'rust slip dress',
    });
  });

  it('says nothing it cannot say: no wears means no date, no anchor means no piece', () => {
    expect(lookFacts({ timesWorn: 0, lastWornOn: '2026-07-23', anchor: null }, 2)).toEqual({
      pieces: 2,
      timesWorn: 0,
      lastWorn: null,
      around: null,
    });
    expect(lookFacts({ timesWorn: 1, lastWornOn: null }, 1).lastWorn).toBeNull();
  });
});

describe('the Add-a-look picker', () => {
  const a = { name: 'Brunch', lastWornOn: '2026-10-10', pieces: [] };
  const b = { name: 'Archive', lastWornOn: null, pieces: [] };
  const c = { name: 'Cocktails', lastWornOn: '2026-10-12', pieces: [] };
  it('orders by last worn, the never-worn at the end, and turns round', () => {
    expect(pickerOrder([a, b, c], true).map((l) => l.name)).toEqual([
      'Cocktails',
      'Brunch',
      'Archive',
    ]);
    expect(pickerOrder([a, b, c], false).map((l) => l.name)).toEqual([
      'Archive',
      'Brunch',
      'Cocktails',
    ]);
  });
  it('finds a look by its name or a piece', () => {
    const look = {
      name: 'Office armour',
      pieces: [{ piece: { label: 'Wool blazer', brand: 'Toteme' } }],
    };
    expect(lookMatches(look, '')).toBe(true);
    expect(lookMatches(look, 'ARMOUR')).toBe(true);
    expect(lookMatches(look, 'blazer')).toBe(true);
    expect(lookMatches(look, 'totê')).toBe(false);
    expect(lookMatches(look, 'toteme')).toBe(true);
    expect(lookMatches(look, 'sandals')).toBe(false);
  });
});

describe('a look’s Wear it for', () => {
  const look = (...tags: string[][]) => ({
    pieces: tags.map((wearFor) => ({ piece: { wearFor } })),
  });
  it('is what every piece carries, Everyday aside, two at most', () => {
    expect(
      lookWearFor(look(['Work', 'Everyday', 'Evening'], ['Evening', 'Work', 'Everyday'])),
    ).toEqual(['Evening', 'Work']);
    expect(lookWearFor(look(['Work'], ['Evening']))).toEqual([]);
    expect(lookWearFor(look())).toEqual([]);
  });
  it('offers the union across looks', () => {
    expect(wearForOptions([look(['Work']), look(['Travel'], ['Travel'])])).toEqual([
      'Travel',
      'Work',
    ]);
  });
});

describe('lookLine', () => {
  const p = (label: string) => ({ piece: { label } });
  it('reads Robes’ note, else names the pieces', () => {
    expect(lookLine({ note: 'Soft tailoring. Easy shoes. A sharp bag. More.', pieces: [] })).toBe(
      'Soft tailoring. Easy shoes. A sharp bag.',
    );
    expect(
      lookLine({ note: null, pieces: [p('Camel coat'), p('Straight jeans'), p('Loafers')] }),
    ).toBe('Camel coat, Straight jeans and Loafers');
    expect(lookLine({ note: null, pieces: [p('Camel coat')] })).toBe('Camel coat');
    expect(lookLine({ note: null, pieces: [] })).toBe('');
  });
});
