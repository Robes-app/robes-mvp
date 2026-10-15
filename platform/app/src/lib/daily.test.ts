import type { DailyLook } from '@robes/contracts';
import { describe, expect, it } from 'vitest';
import { anchorPending, itemsLanding, weatherLine } from './daily';

const look = (image: unknown, createdAt = new Date().toISOString()) =>
  ({
    createdAt,
    steps: [{ title: 'The Anchor', items: [{ image }] }],
  }) as unknown as DailyLook;

describe('daily helpers', () => {
  it('joins whatever weather Robes found', () => {
    expect(weatherLine({ city: 'Dublin', tempRange: '9–14°C', condition: 'Light rain' })).toBe(
      'Dublin · 9–14°C · Light rain',
    );
    expect(weatherLine({ city: null, tempRange: '9–14°C', condition: null })).toBe('9–14°C');
    expect(weatherLine({ city: null, tempRange: null, condition: null })).toBeNull();
    expect(weatherLine(null)).toBeNull();
  });

  it('waits for the anchor frame only while it can still arrive', () => {
    expect(anchorPending(look(null))).toBe(true);
    expect(anchorPending(look({ status: 'pending' }))).toBe(true);
    expect(anchorPending(look({ status: 'ready' }))).toBe(false);
    expect(anchorPending(look(null, new Date(Date.now() - 10 * 60_000).toISOString()))).toBe(false);
  });
});

describe('itemsLanding', () => {
  const withItems = (...items: { imageIndex: number; imageStatus: string }[]) =>
    ({ steps: [{ title: 'The Canvas', items }] }) as never;
  it('refreshes only while an item she asked for is still on its way', () => {
    const pending = withItems({ imageIndex: 1, imageStatus: 'pending' });
    expect(itemsLanding(pending, [])).toBe(false);
    expect(itemsLanding(pending, [1])).toBe(true);
    expect(itemsLanding(withItems({ imageIndex: 1, imageStatus: 'ready' }), [1])).toBe(false);
    expect(itemsLanding(withItems({ imageIndex: 1, imageStatus: 'failed' }), [1])).toBe(false);
  });
});
