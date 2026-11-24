import { describe, expect, it } from 'vitest';
import { eventMeta } from './admin-meta';

describe('eventMeta', () => {
  it('flattens metadata to label/value pairs, dropping empties', () => {
    expect(
      eventMeta({
        stage: 4,
        modules: ['H0', 'H1', 'O4'],
        inline: true,
        look_id: null,
        door: '',
        nested: { a: 1 },
      }),
    ).toEqual([
      ['stage', '4'],
      ['modules', 'H0,H1,O4'],
      ['inline', 'true'],
      ['nested', '{"a":1}'],
    ]);
  });

  it('caps long values and the number of pairs', () => {
    const long = eventMeta({ text: 'x'.repeat(500) });
    expect(long[0]?.[1]).toHaveLength(120);
    expect(long[0]?.[1].endsWith('…')).toBe(true);
    const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]));
    expect(eventMeta(many)).toHaveLength(8);
  });

  it('reads nothing from a value that is not an object', () => {
    expect(eventMeta(null)).toEqual([]);
    expect(eventMeta('stage')).toEqual([]);
    expect(eventMeta([1, 2])).toEqual([]);
  });
});
