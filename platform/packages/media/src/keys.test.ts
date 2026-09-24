import { describe, expect, it } from 'vitest';
import { mediaKeys, parseOriginalKey } from './keys';
import { renditionKeys } from './manifest';

const USER = '11111111-1111-4111-8111-111111111111';
const ASSET = '22222222-2222-4222-8222-222222222222';

describe('media key layout (infrastructure.md §5)', () => {
  it('builds every key under the owner prefix', () => {
    expect(mediaKeys.original(USER, ASSET)).toBe(`uploads/${USER}/${ASSET}/original`);
    expect(mediaKeys.master(USER, ASSET)).toBe(`media/${USER}/${ASSET}/master.jpg`);
    expect(mediaKeys.rendition(USER, ASSET, 640, 'avif')).toBe(`media/${USER}/${ASSET}/640.avif`);
    expect(mediaKeys.cutout(USER, ASSET, 'png')).toBe(`media/${USER}/${ASSET}/cutout.png`);
    expect(mediaKeys.generated(USER, ASSET, 2)).toBe(`generated/${USER}/${ASSET}/2.png`);
    expect(mediaKeys.userMediaPrefix(USER)).toBe(`media/${USER}/`);
  });

  it('refuses ids that could escape the prefix', () => {
    expect(() => mediaKeys.original('../x', ASSET)).toThrow(/userId/);
    expect(() => mediaKeys.master(USER, `${ASSET}/..`)).toThrow(/assetId/);
    expect(() => mediaKeys.userMediaPrefix('*')).toThrow();
    expect(() => mediaKeys.rendition(USER, ASSET, 0.5, 'webp')).toThrow(/width/);
  });

  it('parses only original upload keys', () => {
    expect(parseOriginalKey(mediaKeys.original(USER, ASSET))).toEqual({
      userId: USER,
      assetId: ASSET,
    });
    expect(parseOriginalKey(mediaKeys.master(USER, ASSET))).toBeNull();
    expect(parseOriginalKey(`generated/${USER}/${ASSET}/0.png`)).toBeNull();
    expect(parseOriginalKey(`uploads/${USER}/${ASSET}/original/x`)).toBeNull();
  });

  it('derives rendition keys from a manifest', () => {
    const keys = renditionKeys(USER, ASSET, {
      v: 1,
      master: { width: 700, height: 500 },
      widths: [320, 640],
    });
    expect(keys.master).toBe(`media/${USER}/${ASSET}/master.jpg`);
    expect(keys.renditions).toEqual([
      {
        width: 320,
        avif: `media/${USER}/${ASSET}/320.avif`,
        webp: `media/${USER}/${ASSET}/320.webp`,
      },
      {
        width: 640,
        avif: `media/${USER}/${ASSET}/640.avif`,
        webp: `media/${USER}/${ASSET}/640.webp`,
      },
    ]);
  });

  it('keeps model portraits in the shared catalog, keyed by picks only', () => {
    expect(mediaKeys.avatarCell('w-s3-h1-nt@v2', 'png')).toBe('catalog/avatar/w-s3-h1-nt@v2.png');
    expect(() => mediaKeys.avatarCell('../media/x@v2', 'png')).toThrow('invalid cellKey');
  });
});
