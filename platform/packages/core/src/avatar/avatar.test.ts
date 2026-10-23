import { describe, expect, it } from 'vitest';
import {
  cellKey,
  figureFromBodyType,
  formatCellId,
  genericCellId,
  genericCellIds,
  nearestIndex,
  parseCellId,
  resolveModel,
  SKIN_SWATCHES,
} from './index';

describe('her model', () => {
  it('matches the legacy cell id contract and round-trips it', () => {
    const id = formatCellId({
      presence: 'man',
      skin: 2,
      hair: 4,
      figure: 'it',
      line: 'straight',
      frame: 'fuller',
    });
    expect(id).toBe('m-s2-h4-it-lr-fl');
    expect(parseCellId(id)).toEqual({
      gender: 'man',
      skin: 2,
      hair: 4,
      figure: 'it',
      nudges: ['lr', 'fl'],
    });
    expect(parseCellId('w-s9-h0-hg')).toBeNull();
    expect(parseCellId('w-s1-h0-xx')).toBeNull();
    expect(cellKey('w-s3-h1-nt')).toBe('w-s3-h1-nt@v2');
  });

  it('rides unspecified presence on the woman catalog', () => {
    expect(resolveModel('unspecified', {}, {}).cellId).toBe('w-s3-h1-nt');
  });

  it('maps reads to the nearest swatch and the body read to a figure', () => {
    expect(nearestIndex('#3B2A22', SKIN_SWATCHES, 3)).toBe(0);
    expect(nearestIndex('#EFD5BD', SKIN_SWATCHES, 3)).toBe(7);
    expect(nearestIndex('not-a-colour', SKIN_SWATCHES, 3)).toBe(3);
    expect(figureFromBodyType('Pear')).toBe('pe');
    expect(figureFromBodyType('Something else')).toBe('nt');
  });

  it('lets hand picks win over reads and says where the model came from', () => {
    const reads = { skinHex: '#3B2A22', hairHex: '#CBAE87', bodyType: 'Hourglass' };
    expect(resolveModel('woman', {}, reads)).toMatchObject({
      cellId: 'w-s0-h4-hg',
      source: 'read',
    });
    expect(resolveModel('woman', { skin: 6, line: 'soft' }, reads)).toMatchObject({
      cellId: 'w-s6-h4-hg-ll',
      source: 'mixed',
    });
    expect(resolveModel('woman', { hair: 2 }, {}).source).toBe('hand');
  });
});

describe('the generic models', () => {
  it('stands each of the three ways on its own catalog cell, a man on the m- catalog', () => {
    expect(genericCellIds('woman')).toEqual(['w-s4-h1-nt', 'w-s1-h0-nt', 'w-s7-h3-nt']);
    expect(genericCellId('man', 1)).toBe('m-s1-h0-nt');
    expect(genericCellId('woman', 3)).toBe('w-s4-h1-nt');
    for (const id of genericCellIds('man')) expect(parseCellId(id)?.gender).toBe('man');
  });
});
