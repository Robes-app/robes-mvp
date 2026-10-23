import { describe, expect, it } from 'vitest';
import {
  adjFor,
  bustCmOf,
  effectiveStops,
  NO_ADJ,
  stepTwinFact,
  type TwinFacts,
  type TwinInputs,
  twinAge,
  twinFigure,
  twinInputsOf,
  twinKey,
  twinKeyMaterial,
  twinSpec,
} from './index';

const none: TwinFacts = {
  heightCm: null,
  sizeUk: null,
  bustBand: null,
  bustCup: null,
  bustCm: null,
  waistCm: null,
  ageBand: null,
};
const inputs = (over: Partial<TwinInputs> = {}): TwinInputs => ({
  gender: 'woman',
  facts: none,
  adj: NO_ADJ,
  skin: 3,
  hair: 1,
  skinSet: false,
  hairSet: false,
  closeUpAssetId: null,
  ...over,
});

describe('the twin', () => {
  it('reads a bra size or a tape as one bust measure', () => {
    expect(bustCmOf({ bustBand: 34, bustCup: 'C', bustCm: null })).toBe(
      Math.round(34 * 2.54 + 3.5 * 2.54),
    );
    expect(bustCmOf({ bustBand: 34, bustCup: null, bustCm: null })).toBeNull();
    expect(bustCmOf({ bustBand: null, bustCup: null, bustCm: 92 })).toBe(92);
  });

  it('seeds the bust from the bust−waist difference, hers where she set it', () => {
    const facts = { ...none, bustCm: 96, waistCm: 70 };
    expect(effectiveStops(facts, NO_ADJ)).toMatchObject({ bust: 2, shoulders: 0, waistDiff: 26 });
    expect(effectiveStops({ ...facts, bustCm: 75 }, NO_ADJ).bust).toBe(-1);
    expect(effectiveStops(facts, { ...NO_ADJ, bust: -2 }).bust).toBe(-2);
  });

  it('seeds the sliders once from a legacy line read, then keeps hers', () => {
    expect(adjFor(undefined, 'Inverted Triangle')).toEqual({ shoulders: 1, bust: null, hips: -1 });
    expect(adjFor(undefined, null)).toEqual(NO_ADJ);
    expect(adjFor({ hips: 2, bust: 7 }, 'Pear')).toEqual({ shoulders: null, bust: null, hips: 2 });
    expect(adjFor({}, 'Pear')).toEqual(NO_ADJ);
  });

  it('defaults to 35 and resolves a band to its youngest year', () => {
    expect(twinAge(null)).toBe(35);
    expect(twinAge('under_25')).toBe(22);
    expect(twinAge('45_54')).toBe(45);
    expect(twinSpec(inputs(), false)).toMatchObject({ sizeUk: 10, age: 35, gender: 'woman' });
  });

  it('keys on everything it is drawn from', () => {
    const a = twinKeyMaterial(inputs());
    expect(twinKeyMaterial(inputs())).toBe(a);
    expect(twinKeyMaterial(inputs({ adj: { ...NO_ADJ, hips: 1 } }))).not.toBe(a);
    expect(twinKeyMaterial(inputs({ closeUpAssetId: 'x' }))).not.toBe(a);
    expect(twinKeyMaterial(inputs({ facts: { ...none, waistCm: 70 } }))).not.toBe(a);
  });

  it('draws a figure that moves with a slider', () => {
    const base = twinFigure(none, NO_ADJ);
    expect(base.d.startsWith('M')).toBe(true);
    expect(base.d.endsWith('Z')).toBe(true);
    expect(base.guides.bust).toBeLessThan(base.guides.waist);
    expect(twinFigure(none, { ...NO_ADJ, hips: 2 }).d).not.toBe(base.d);
    expect(twinFigure({ ...none, heightCm: 150 }, NO_ADJ).headY).toBeGreaterThan(base.headY);
  });

  it('reads a stored row: hand picks are overrides, reads fill the rest', async () => {
    const row = {
      genderIdentity: 'unspecified',
      avatarPrefs: { skin: 6, adj: { hips: 1 } },
      ...none,
      bodyType: 'Pear',
      headshotAssetId: 'asset-1',
      skinHex: null,
      hairHex: '#1B1614',
    };
    const i = twinInputsOf(row);
    expect(i).toMatchObject({ gender: 'woman', skin: 6, skinSet: true, hair: 0, hairSet: false });
    expect(i.adj).toEqual({ ...NO_ADJ, hips: 1 });
    expect(i.closeUpAssetId).toBe('asset-1');
    // No sliders on file: the legacy line read seeds them.
    expect(twinInputsOf({ ...row, avatarPrefs: {} }).adj).toEqual({ ...NO_ADJ, hips: 1 });
    expect(await twinKey(i)).toMatch(/^[0-9a-f]{24}$/);
    expect(await twinKey(i)).toBe(await twinKey(twinInputsOf(row)));
  });

  it('steps the new facts within their ranges', () => {
    expect(stepTwinFact('bustBand', null, 1)).toBe(34);
    expect(stepTwinFact('bustBand', 46, 1)).toBe(46);
    expect(stepTwinFact('waistCm', 70, -1)).toBe(69);
  });
});
