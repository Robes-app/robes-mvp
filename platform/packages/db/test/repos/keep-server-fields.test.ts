import { describe, expect, it } from 'vitest';
import { keepServerFields } from '../../src/repos/looks';

// A rack saved from the app keeps what only the server sets on a proposal.
describe('keepServerFields', () => {
  const stored = [
    { key: 'p-aaaa1111', name: 'Silk cami', anchor: true, wishlisted: true, wishlistItemId: 'w1' },
    { key: 'p-bbbb2222', name: 'Black mules' },
  ];
  it('keeps the anchor a wish draft was started from, and takes none from the request', () => {
    const out = keepServerFields(
      [
        { key: 'p-aaaa1111', name: 'Silk cami' },
        { key: 'p-bbbb2222', name: 'Black mules', anchor: true },
        { key: 'p-cccc3333', name: 'Gold hoops', anchor: true },
      ],
      stored,
    );
    expect(out?.map((p) => p.anchor)).toEqual([true, undefined, undefined]);
    expect(out?.[0]).toMatchObject({ wishlisted: true, wishlistItemId: 'w1' });
  });
});
