import { describe, expect, it } from 'vitest';
import {
  adjFor,
  bustCmOf,
  chosenTones,
  effectiveStops,
  hasTwinInputs,
  isTwinCurrent,
  NO_ADJ,
  readAdj,
  resetScales,
  scalesFor,
  storedScales,
  type TwinFacts,
  type TwinInputs,
  twinAge,
  twinFigure,
  twinInputsOf,
  twinKey,
  twinKeyMaterial,
  twinSpec,
  twinStatusIndex,
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
  it('is drawn from a close-up, a measurement, a slider or a pick, never from her age alone', () => {
    expect(hasTwinInputs(inputs())).toBe(false);
    // Her age is given under Style DNA › You and stays when she deletes her twin.
    expect(hasTwinInputs(inputs({ facts: { ...none, ageBand: '35_44' } }))).toBe(false);
    expect(hasTwinInputs(inputs({ facts: { ...none, ageBand: '35_44', heightCm: 167 } }))).toBe(
      true,
    );
    expect(hasTwinInputs(inputs({ closeUpAssetId: 'c' }))).toBe(true);
    expect(hasTwinInputs(inputs({ skinSet: true }))).toBe(true);
  });

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
    expect(adjFor(undefined, 'Inverted Triangle')).toEqual({ ...NO_ADJ, shoulders: 1, hips: -1 });
    expect(adjFor(undefined, null)).toEqual(NO_ADJ);
    expect(adjFor({ hips: 2, bust: 7 }, 'Pear')).toEqual({ ...NO_ADJ, hips: 2 });
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

  it('steps the stage’s status a line at a time, from the read or the drawing, holding the last', () => {
    const at = (startedReading: boolean, reading: boolean, elapsedMs: number) =>
      twinStatusIndex({ count: 4, drawingFrom: 2, startedReading, reading, elapsedMs });
    expect(at(true, true, 0)).toBe(0);
    expect(at(true, true, 4_000)).toBe(1);
    // The read done early: straight to the drawing; never back.
    expect(at(true, false, 1_000)).toBe(2);
    expect(at(true, false, 12_000)).toBe(3);
    expect(at(true, true, 60_000)).toBe(3);
    // A redraw with no selfie starts at the drawing.
    expect(at(false, false, 0)).toBe(2);
    expect(at(false, false, 4_000)).toBe(3);
  });

  it('keys a twin drawn from her close-up apart from the colouring read from it', async () => {
    const photo = inputs({ closeUpAssetId: 'x' });
    // The read lands mid-draw: the twin it started is still the one she has.
    expect(twinKeyMaterial({ ...photo, skin: 6, hair: 4 })).toBe(twinKeyMaterial(photo));
    // A hand pick is in the prompt, so it is in the key; without a photo the tones are words.
    expect(twinKeyMaterial({ ...photo, skin: 6, skinSet: true })).not.toBe(twinKeyMaterial(photo));
    expect(twinKeyMaterial({ ...photo, hair: 4, hairSet: true })).not.toBe(twinKeyMaterial(photo));
    expect(twinKeyMaterial(inputs({ skin: 6 }))).not.toBe(twinKeyMaterial(inputs()));
  });

  it('keeps a twin stored under the key that hashed the read colouring', async () => {
    const photo = inputs({ closeUpAssetId: 'x', skin: 6 });
    const before = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        JSON.stringify([
          JSON.parse(twinKeyMaterial(photo))[0],
          'woman',
          [null, null, null, null, null, null, null],
          [null, null, null],
          6,
          1,
          false,
          false,
          'x',
        ]),
      ),
    );
    const legacy = [...new Uint8Array(before)]
      .slice(0, 12)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(legacy).not.toBe(await twinKey(photo));
    expect(await isTwinCurrent(legacy, photo)).toBe(true);
    expect(await isTwinCurrent(await twinKey(photo), photo)).toBe(true);
    expect(await isTwinCurrent(legacy, { ...photo, skin: 2 })).toBe(false);
    expect(await isTwinCurrent(null, photo)).toBe(false);
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
      chestCm: null,
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

  it('gives him a waist scale in place of her hips (24 Nov)', () => {
    expect(scalesFor('man')).toEqual(['shoulders', 'bust', 'waist']);
    expect(scalesFor('non_binary')).toEqual(['shoulders', 'bust', 'hips']);
    // A scale he is not offered reads as unset; hers is untouched.
    expect(readAdj({ hips: 2, waist: 1 }, 'man')).toEqual({ ...NO_ADJ, waist: 1 });
    expect(readAdj({ hips: 2, waist: 1 }, 'woman')).toEqual({ ...NO_ADJ, hips: 2 });
    expect(twinFigure(none, { ...NO_ADJ, waist: 2 }).d).not.toBe(twinFigure(none, NO_ADJ).d);
    const man = inputs({ gender: 'man' });
    expect(twinKeyMaterial({ ...man, adj: { ...NO_ADJ, waist: 1 } })).not.toBe(
      twinKeyMaterial(man),
    );
    expect(twinSpec({ ...man, adj: { ...NO_ADJ, waist: -1 } }, false).stops.waist).toBe(-1);
  });

  it('keeps every scale on file across a switch of gender; Reset clears only the ones shown', () => {
    const onFile = storedScales({ hips: 2, waist: 1, bust: 7 }, null);
    expect(onFile).toEqual({ ...NO_ADJ, hips: 2, waist: 1 });
    // No sliders on file: the legacy seed, every scale of it.
    expect(storedScales(undefined, 'Inverted Triangle')).toEqual({
      ...NO_ADJ,
      shoulders: 1,
      hips: -1,
    });
    expect(resetScales(onFile, 'man')).toEqual({ ...NO_ADJ, hips: 2 });
    expect(resetScales(onFile, 'woman')).toEqual({ ...NO_ADJ, waist: 1 });
  });

  it('keeps her key as it was before his waist scale', () => {
    const adj = { shoulders: 1, bust: -1, hips: 2 } as const;
    expect(twinKeyMaterial(inputs({ adj: { ...NO_ADJ, ...adj } }))).toBe(
      JSON.stringify([
        'v1',
        'woman',
        [null, null, null, null, null, null, null],
        [1, -1, 2],
        3,
        1,
        false,
        false,
        null,
      ]),
    );
  });

  it('draws his chest from chest_cm, and from the tape he saved before it', () => {
    const row = {
      genderIdentity: 'man',
      avatarPrefs: null,
      ...none,
      chestCm: null,
      bodyType: null,
      headshotAssetId: null,
      skinHex: null,
      hairHex: null,
    };
    expect(twinInputsOf({ ...row, bustCm: 100 }).facts.bustCm).toBe(100);
    expect(twinInputsOf({ ...row, bustCm: 100, chestCm: 104.1 }).facts.bustCm).toBe(104.1);
    expect(
      twinInputsOf({ ...row, genderIdentity: 'woman', bustCm: 90, chestCm: 104 }).facts.bustCm,
    ).toBe(90);
  });

  it('reads a G+ cup as G', () => {
    expect(bustCmOf({ bustBand: 34, bustCup: 'G+', bustCm: null })).toBe(
      bustCmOf({ bustBand: 34, bustCup: 'G', bustCm: null }),
    );
  });
});

describe('chosenTones', () => {
  const base = { closeUpUrl: null, skin: 3, hair: 1, skinSet: false, hairSet: false };
  it('names nothing until she picks or a close-up reads', () => {
    expect(chosenTones(base)).toEqual({ skin: null, hair: null });
    expect(chosenTones({ ...base, skinSet: true })).toEqual({ skin: 3, hair: null });
    expect(chosenTones({ ...base, closeUpUrl: 'https://x/c.jpg' })).toEqual({ skin: 3, hair: 1 });
  });
});
