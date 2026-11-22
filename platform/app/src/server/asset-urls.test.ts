import { describe, expect, it, vi } from 'vitest';
import { toImage } from './asset-urls';

const USER = '11111111-1111-4111-8111-111111111111';
const ASSET = '33333333-3333-4333-8333-333333333333';
const delivery = { url: vi.fn(async (key: string) => `https://media.test/${key}?signed`) };
const asset = (over: object = {}) => ({
  id: ASSET,
  status: 'ready',
  renditions: { v: 1, master: { width: 800, height: 1000 }, widths: [320] },
  width: 800,
  height: 1000,
  blurhash: null,
  ...over,
});

describe('toImage', () => {
  it('signs the cutout beside the photograph where one was made', async () => {
    const image = await toImage(delivery, USER, asset({ hasCutout: true }));
    expect(image.cutout).toBe(`https://media.test/media/${USER}/${ASSET}/cutout.webp?signed`);
    // The rectangle is always there too.
    expect(image.renditions).toHaveLength(1);
  });

  it('offers none where none was made, or before the photograph is ready', async () => {
    expect((await toImage(delivery, USER, asset())).cutout).toBeNull();
    expect((await toImage(delivery, USER, asset({ hasCutout: false }))).cutout).toBeNull();
    expect(
      (await toImage(delivery, USER, asset({ hasCutout: true, status: 'pending' }))).cutout,
    ).toBeNull();
  });
});
