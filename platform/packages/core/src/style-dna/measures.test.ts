import { describe, expect, it } from 'vitest';
import {
  BUST_CUPS,
  bustOf,
  bustPatch,
  CLEARED_FACTS,
  cupOf,
  displayOf,
  FACT_ROWS,
  FIELD_UNITS,
  factRows,
  type MeasureFacts,
  measurePresenceOf,
  optionsOf,
  pickerOf,
  readUnitPrefs,
  STORED_RANGES,
  startOf,
  storedPatch,
  unitFor,
  wheelOf,
} from './measures';

const facts = (patch: Partial<MeasureFacts> = {}): MeasureFacts => ({ ...CLEARED_FACTS, ...patch });

describe('the facts (handoff 24 Nov)', () => {
  it('asks her five things and him seven', () => {
    expect(FACT_ROWS.woman).toEqual(['height', 'size', 'bust', 'waist', 'shoes']);
    expect(FACT_ROWS.man).toEqual([
      'height',
      'chest',
      'waist',
      'inseam',
      'collar',
      'shoes',
      'shoulders',
    ]);
    expect(measurePresenceOf('non_binary')).toBe('woman');
    expect(measurePresenceOf('unspecified')).toBe('woman');
    expect(measurePresenceOf('man')).toBe('man');
  });

  it('defaults each unit, and his waist to inches', () => {
    expect(unitFor({}, 'height', 'woman')).toBe('cm');
    expect(unitFor(null, 'waist', 'woman')).toBe('cm');
    expect(unitFor(null, 'waist', 'man')).toBe('in');
    expect(unitFor(null, 'collar', 'man')).toBe('in');
    expect(unitFor({ bust: 'us' }, 'bust', 'woman')).toBe('us');
    // An older client's bust in cm is not offered any more: it reads as UK.
    expect(unitFor({ bust: 'cm' }, 'bust', 'woman')).toBe('uk');
    expect(readUnitPrefs({ bust: 'cm', collar: 'cm', nope: 'in', size: 7 })).toEqual({
      collar: 'cm',
    });
    expect(FIELD_UNITS.bust).toEqual(['uk', 'us', 'eu']);
  });

  it('converts dress size and shoes from the stored UK number', () => {
    const f = facts({ sizeUk: 12, shoeUk: 7 });
    expect(displayOf('size', 'uk', f, 'woman')).toBe(12);
    expect(displayOf('size', 'us', f, 'woman')).toBe(8);
    expect(displayOf('size', 'eu', f, 'woman')).toBe(40);
    expect(displayOf('shoes', 'us', f, 'woman')).toBe(9);
    expect(displayOf('shoes', 'us', f, 'man')).toBe(8);
    expect(displayOf('shoes', 'eu', facts({ shoeUk: 5.5 }), 'woman')).toBe(39);
    expect(storedPatch('size', 'us', 8, 'woman')).toEqual({ sizeUk: 12 });
    expect(storedPatch('shoes', 'eu', 40, 'man')).toEqual({ shoeUk: 7 });
    expect(storedPatch('shoes', 'us', 9.5, 'woman')).toEqual({ shoeUk: 7.5 });
  });

  it('stores lengths in cm, whole for height and waist, to the tenth for the rest', () => {
    expect(storedPatch('waist', 'in', 32, 'man')).toEqual({ waistCm: 81 });
    expect(storedPatch('collar', 'in', 15.5, 'man')).toEqual({ collarCm: 39.4 });
    expect(storedPatch('chest', 'in', 40, 'man')).toEqual({ chestCm: 101.6 });
    expect(storedPatch('chest', 'cm', 102, 'man')).toEqual({ chestCm: 102 });
    // A half inch survives the round trip.
    expect(displayOf('collar', 'in', facts({ collarCm: 39.4 }), 'man')).toBe(15.5);
    expect(displayOf('shoulders', 'in', facts({ shoulderWidthCm: 45.7 }), 'man')).toBe(18);
    expect(displayOf('height', 'in', facts({ heightCm: 168 }), 'woman')).toBe(66);
    expect(displayOf('chest', 'cm', facts({ chestCm: 101.6 }), 'man')).toBe(102);
    expect(displayOf('waist', 'cm', facts(), 'woman')).toBeNull();
  });

  it('never offers a value that cannot be stored', () => {
    for (const presence of ['woman', 'man'] as const) {
      for (const field of FACT_ROWS[presence]) {
        if (field === 'bust') continue;
        for (const unit of FIELD_UNITS[field]) {
          for (const v of optionsOf(field, unit, presence)) {
            const [key, stored] = Object.entries(storedPatch(field, unit, v, presence))[0] as [
              keyof typeof STORED_RANGES,
              number,
            ];
            const r = STORED_RANGES[key];
            expect(stored, `${field} ${unit} ${v}`).toBeGreaterThanOrEqual(r.min);
            expect(stored, `${field} ${unit} ${v}`).toBeLessThanOrEqual(r.max);
            // What the wheel stores reads back as the value she picked.
            expect(displayOf(field, unit, facts({ [key]: stored }), presence)).toBe(v);
          }
        }
      }
    }
    expect(optionsOf('height', 'in', 'woman').at(-1)).toBe(82);
    expect(optionsOf('size', 'uk', 'woman')).toEqual([4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
    expect(optionsOf('collar', 'in', 'man').slice(0, 3)).toEqual([14, 14.5, 15]);
  });

  it('shows the bust in UK, US or EU, the band by formula and the cup by place', () => {
    const f = facts({ bustBand: 34, bustCup: 'DD' });
    expect(bustOf('uk', f)).toEqual({ band: 34, cup: 'DD' });
    expect(bustOf('us', f)).toEqual({ band: 34, cup: 'DD' });
    expect(bustOf('eu', f)).toEqual({ band: 75, cup: 'E' });
    expect(bustOf('us', facts({ bustBand: 34, bustCup: 'FF' }))?.cup).toBe('H');
    expect(bustOf('eu', facts({ bustBand: 34, bustCup: 'G' }))?.cup).toBe('I');
    // A tape measure alone is not a bra size.
    expect(bustOf('uk', facts({ bustCm: 90 }))).toBeNull();
    expect(BUST_CUPS).toHaveLength(10);
  });

  it('reads a cup saved as G+ as G, and drops the tape on a pick', () => {
    expect(cupOf('G+')).toBe('G');
    expect(cupOf('Z')).toBeNull();
    expect(bustPatch(facts({ bustCm: 90 }), { band: 36 })).toEqual({
      bustBand: 36,
      bustCup: 'B',
      bustCm: null,
    });
    expect(bustPatch(facts({ bustBand: 32, bustCup: 'G+' }), { cup: 'A' })).toEqual({
      bustBand: 32,
      bustCup: 'A',
      bustCm: null,
    });
  });

  it('draws five wheel slots around the value, blank past the ends', () => {
    const w = wheelOf([1, 2, 3, 4], 1);
    expect(w.map((s) => s.value)).toEqual([null, null, 1, 2, 3]);
    expect(w.map((s) => s.selected)).toEqual([false, false, true, false, false]);
    expect(w.map((s) => s.distance)).toEqual([2, 1, 0, 1, 2]);
    expect(wheelOf([10, 12, 14], 13.4, (v) => Math.abs(v - 13.4))[2]?.value).toBe(14);
    expect(displayOf('height', 'cm', startOf('height', 'man'), 'man')).toBe(178);
  });
});

describe('the rows and the picker', () => {
  it('reads each row in her unit, Add where nothing is given', () => {
    const rows = factRows(
      facts({ heightCm: 166, bustBand: 34, bustCup: 'C' }),
      { bust: 'eu' },
      'woman',
    );
    expect(rows.map((r) => [r.field, r.unit, r.value])).toEqual([
      ['height', 'cm', 166],
      ['size', 'uk', null],
      ['bust', 'eu', { band: 75, cup: 'C' }],
      ['waist', 'cm', null],
      ['shoes', 'uk', null],
    ]);
  });

  it('opens a wheel on her value, or the middle when she has none, and saves the stored value', () => {
    const [col] = pickerOf('collar', 'in', facts({ collarCm: 39.4 }), 'man');
    expect(col?.slots.map((s) => s.shown)).toEqual([14.5, 15, 15.5, 16, 16.5]);
    expect(col?.slots[3]?.patch).toEqual({ collarCm: 40.6 });
    const [empty] = pickerOf('height', 'cm', facts(), 'woman');
    expect(empty?.slots[2]?.shown).toBe(168);
    expect(empty?.slots[2]?.selected).toBe(true);
  });

  it('gives the bust two wheels in her unit, each saving band and cup together', () => {
    const [band, cup] = pickerOf('bust', 'eu', facts({ bustBand: 28, bustCup: 'AA' }), 'woman');
    expect(band?.slots.map((s) => s.shown)).toEqual([null, null, 60, 65, 70]);
    expect(band?.slots[3]?.patch).toEqual({ bustBand: 30, bustCup: 'AA', bustCm: null });
    expect(cup?.slots.map((s) => s.shown)).toEqual([null, null, 'AA', 'A', 'B']);
    expect(cup?.slots[0]?.patch).toBeNull();
  });
});
