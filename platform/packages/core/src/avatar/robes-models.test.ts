import { describe, expect, it } from 'vitest';
import {
  CATALOG_KEY,
  catalogGender,
  catalogKey,
  HAIR_SWATCHES,
  parseCellId,
  parseRobesModelId,
  ROBES_MODELS,
  robesModelId,
  robesModelIds,
  robesModelSpec,
  standOf,
  stoodOnOf,
} from './index';

describe('the Robes models', () => {
  it('are five per wearer, in their own grammar, at their own style', () => {
    expect(robesModelIds('woman')).toEqual(['w-r1', 'w-r2', 'w-r3', 'w-r4', 'w-r5']);
    expect(robesModelId('man', 4)).toBe('m-r4');
    expect(parseRobesModelId('m-r2')).toEqual({ gender: 'man', n: 2 });
    expect(parseRobesModelId('w-r6')).toBeNull();
    expect(parseRobesModelId('w-s4-h1-nt')).toBeNull();
    expect(catalogKey('w-r4')).toBe('w-r4@v1');
    expect(catalogKey('w-s4-h1-nt')).toBe('w-s4-h1-nt@v2');
    expect(catalogGender('m-r1')).toBe('man');
    expect(catalogGender('w-s4-h5-nt')).toBe('woman');
    expect(catalogGender('nonsense')).toBeNull();
  });

  it('cover age and size as well as colouring, and every swatch they name exists', () => {
    const older = ROBES_MODELS[3];
    const larger = ROBES_MODELS[4];
    expect(older?.age).toBeGreaterThanOrEqual(60);
    expect(larger?.sizeUk).toBeGreaterThanOrEqual(18);
    for (const m of ROBES_MODELS) expect(HAIR_SWATCHES[m.hair]).toBeDefined();
    // Silver is the sixth hair swatch; the older model wears it.
    expect(HAIR_SWATCHES).toHaveLength(6);
    expect(older?.hair).toBe(5);
    expect(parseCellId('w-s4-h5-nt')?.hair).toBe(5);
  });

  it('draw through the twin prompt with no face', () => {
    expect(robesModelSpec('w-r4')).toMatchObject({
      gender: 'woman',
      age: 62,
      sizeUk: 12,
      skin: 6,
      hair: 5,
      hasFace: false,
      skinSet: false,
      hairSet: false,
    });
    expect(robesModelSpec('m-r5')?.gender).toBe('man');
    expect(robesModelSpec('w-s4-h1-nt')).toBeNull();
  });

  it('every catalog key fits one regex: picks cells, silver hair, Robes models', () => {
    for (const k of ['w-s3-h1-nt@v2', 'm-s0-h5-hg-ll-fr@v2', 'w-r4@v1', 'm-r1@v3']) {
      expect(k).toMatch(CATALOG_KEY);
    }
    for (const k of ['w-r0@v1', 'w-r6@v1', 'w-s3-h6-nt@v2', 'preset:w4@v1', 'w-r4']) {
      expect(k).not.toMatch(CATALOG_KEY);
    }
  });
});

describe('what her looks stand on', () => {
  const base = {
    genderIdentity: 'woman',
    modelPreset: null,
    filedCellId: null,
    twinAssetId: null,
    twinKey: null,
  };
  it('the first Robes model while she has nothing, the one she chose once she has', () => {
    expect(standOf(base)).toEqual({ on: 'robes', cellId: 'w-r1', n: 1 });
    expect(standOf({ ...base, genderIdentity: 'man', modelPreset: 4 })).toEqual({
      on: 'robes',
      cellId: 'm-r4',
      n: 4,
    });
    expect(standOf({ ...base, modelPreset: 9 })).toEqual({ on: 'robes', cellId: 'w-r1', n: 1 });
  });

  it('her twin once drawn, unless she chose a Robes model over it; a hand-built cell likewise', () => {
    expect(standOf({ ...base, twinAssetId: 'a', twinKey: 'k' })).toEqual({ on: 'twin' });
    expect(standOf({ ...base, twinAssetId: 'a', twinKey: 'k', modelPreset: 3 })).toEqual({
      on: 'robes',
      cellId: 'w-r3',
      n: 3,
    });
    expect(standOf({ ...base, filedCellId: 'w-s3-h1-nt' })).toEqual({
      on: 'cell',
      cellId: 'w-s3-h1-nt',
    });
    expect(standOf({ ...base, filedCellId: 'w-s3-h1-nt', modelPreset: 2 }).on).toBe('robes');
  });
});

describe('what a picture stood on, from its render key', () => {
  it('names a twin, a Robes model (new or legacy generic), a hand-built cell; a frame says nothing', () => {
    expect(stoodOnOf('twin:abc123:rack')).toBe('twin');
    expect(stoodOnOf('w-r4@v1:rack')).toBe('robes');
    expect(stoodOnOf('m-s1-h0-nt@v2:rack')).toBe('robes');
    expect(stoodOnOf('w-s3-h1-nt-ll@v2:rack')).toBe('cell');
    expect(stoodOnOf('frame:k1')).toBeNull();
    expect(stoodOnOf(null)).toBeNull();
    expect(stoodOnOf('nonsense')).toBeNull();
  });
});
