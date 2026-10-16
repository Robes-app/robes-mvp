import { describe, expect, it } from 'vitest';
import { imageSources } from './image';

const r = (width: number) => ({
  width,
  avif: `https://m.test/${width}.avif`,
  webp: `https://m.test/${width}.webp`,
});

describe('imageSources', () => {
  it('is null with no renditions', () => expect(imageSources([])).toBeNull());

  it('lists webp widths ascending and uses the largest as src', () => {
    expect(imageSources([r(1080), r(320), r(640)])).toEqual({
      src: 'https://m.test/1080.webp',
      srcSet:
        'https://m.test/320.webp 320w, https://m.test/640.webp 640w, https://m.test/1080.webp 1080w',
    });
  });
});
