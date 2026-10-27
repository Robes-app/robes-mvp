import { describe, expect, it } from 'vitest';
import { receivedDay, splitAddress, toggleKept } from './index';

describe('toggleKept', () => {
  it('unticks a kept piece and ticks it back in order', () => {
    expect(toggleKept([0, 1, 2], 1)).toEqual([0, 2]);
    expect(toggleKept([0, 2], 1)).toEqual([0, 1, 2]);
    expect(toggleKept([], 3)).toEqual([3]);
  });
});

describe('receivedDay', () => {
  const now = new Date(2026, 9, 26, 15, 0);
  it('reads today and yesterday on her own calendar', () => {
    expect(receivedDay(new Date(2026, 9, 26, 0, 5).toISOString(), now)).toEqual({
      kind: 'today',
    });
    expect(receivedDay(new Date(2026, 9, 25, 23, 50).toISOString(), now)).toEqual({
      kind: 'yesterday',
    });
  });

  it('names an older day by its date', () => {
    expect(receivedDay(new Date(2026, 8, 12, 9, 0).toISOString(), now)).toEqual({
      kind: 'date',
      label: '12 Sep',
    });
  });
});

describe('splitAddress', () => {
  it('breaks only at the @', () => {
    expect(splitAddress('k3x9p2m7q1w5e8r4t6y0@in.staging.mail.byrobes.com')).toEqual({
      local: 'k3x9p2m7q1w5e8r4t6y0',
      domain: '@in.staging.mail.byrobes.com',
    });
  });

  it('leaves an address with no @ whole', () => {
    expect(splitAddress('nothing-here')).toEqual({ local: 'nothing-here', domain: '' });
    expect(splitAddress('@lonely')).toEqual({ local: '@lonely', domain: '' });
  });
});
