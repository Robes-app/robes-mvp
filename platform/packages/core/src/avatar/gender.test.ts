import { describe, expect, it } from 'vitest';
import { formatCellId, GENDER_IDENTITIES, presenceOf, readsAsThey } from './index';

describe('gender identities (non-binary, 29 Oct)', () => {
  it('holds the four values profiles.gender_identity allows', () => {
    expect(GENDER_IDENTITIES).toEqual(['woman', 'man', 'non_binary', 'unspecified']);
  });

  it('reads a stored value, and anything unknown as woman', () => {
    expect(presenceOf('non_binary')).toBe('non_binary');
    expect(presenceOf('man')).toBe('man');
    expect(presenceOf('other')).toBe('woman');
    expect(presenceOf(null)).toBe('woman');
  });

  it('reads non-binary and "prefer not to say" as they', () => {
    expect(readsAsThey('non_binary')).toBe(true);
    expect(readsAsThey('unspecified')).toBe(true);
    expect(readsAsThey('woman')).toBe(false);
    expect(readsAsThey('man')).toBe(false);
  });

  it('draws a non-binary figure from the woman’s catalog, as for unspecified', () => {
    const cell = (presence: 'non_binary' | 'man') =>
      formatCellId({ presence, skin: 3, hair: 1, figure: 'nt', line: null, frame: null });
    expect(cell('non_binary').startsWith('w-')).toBe(true);
    expect(cell('man').startsWith('m-')).toBe(true);
  });
});
