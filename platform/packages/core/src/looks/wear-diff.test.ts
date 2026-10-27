import { describe, expect, it } from 'vitest';
import { wearDiff } from './index';

const label = (id: string) => ({ a: 'Camel coat', b: 'Straight jeans', c: 'Loafers' })[id] ?? null;

describe('wearDiff', () => {
  it('says nothing when she wore the look as it stands', () => {
    const d = wearDiff([{ id: 'a', label: 'Camel coat' }], [{ id: 'a' }], label);
    expect(d).toEqual({ differs: false, instead: [], without: [] });
  });

  it('names what she wore instead, and what the look holds that she did not', () => {
    const d = wearDiff(
      [
        { id: 'a', label: 'Camel coat' },
        { id: 'c', label: 'Loafers' },
      ],
      [{ id: 'a' }, { id: 'b' }],
      label,
    );
    expect(d).toEqual({ differs: true, instead: ['Loafers'], without: ['Straight jeans'] });
  });

  it('counts a piece with no name left rather than naming it', () => {
    const d = wearDiff([{ id: 'z', label: null }], [], label);
    expect(d).toEqual({ differs: true, instead: [], without: [] });
  });
});
