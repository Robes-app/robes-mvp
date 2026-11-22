import { LIFT_LABEL_STEP } from '@robes/core/cutout';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { cutOut, decodeLift } from './cutout';

// A photograph drawn for the test: a beige surface with coloured blocks standing in for pieces,
// and the lift a phone would send for it (red: which item, green: how much of the pixel is it).
interface Block {
  left: number;
  top: number;
  width: number;
  height: number;
  colour: string;
  item: number;
}

async function scene(width: number, height: number, blocks: Block[], liftScale = 1) {
  const photo = await sharp({ create: { width, height, channels: 3, background: '#d9c8ae' } })
    .composite(
      blocks.map((b) => ({
        input: {
          create: { width: b.width, height: b.height, channels: 3 as const, background: b.colour },
        },
        left: b.left,
        top: b.top,
      })),
    )
    .jpeg({ quality: 95 })
    .toBuffer();
  const s = (n: number) => Math.round(n * liftScale);
  const lift = await sharp({
    create: { width: s(width), height: s(height), channels: 3, background: '#000000' },
  })
    .composite(
      blocks.map((b) => ({
        input: {
          create: {
            width: s(b.width),
            height: s(b.height),
            channels: 3 as const,
            background: { r: b.item * LIFT_LABEL_STEP, g: 255, b: 0 },
          },
        },
        left: s(b.left),
        top: s(b.top),
      })),
    )
    .png()
    .toBuffer();
  return { photo, lift };
}

const frac = (b: Block, width: number, height: number) => ({
  x: b.left / width,
  y: b.top / height,
  w: b.width / width,
  h: b.height / height,
});

async function pixel(image: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const o = (y * info.width + x) * info.channels;
  return [...data.subarray(o, o + 4)];
}

const TOP: Block = { left: 100, top: 60, width: 200, height: 160, colour: '#204080', item: 1 };
const SKIRT: Block = { left: 420, top: 300, width: 160, height: 240, colour: '#a02030', item: 2 };

describe('decodeLift', () => {
  it('reads items and the matte from a PNG', async () => {
    const { lift } = await scene(800, 600, [TOP, SKIRT]);
    const map = await decodeLift(lift);
    expect([map.width, map.height]).toEqual([800, 600]);
    expect(map.labels[100 * 800 + 150]).toBe(1);
    expect(map.matte[100 * 800 + 150]).toBe(255);
    expect(map.labels[400 * 800 + 500]).toBe(2);
    expect(map.labels[10 * 800 + 10]).toBe(0);
  });

  it('refuses anything that is not a PNG of a sane size', async () => {
    const jpeg = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#000' } })
      .jpeg()
      .toBuffer();
    await expect(decodeLift(jpeg)).rejects.toThrow();
    await expect(decodeLift(new TextEncoder().encode('not an image'))).rejects.toThrow();
    const huge = await sharp({
      create: { width: 2100, height: 40, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();
    await expect(decodeLift(huge)).rejects.toThrow();
  });
});

describe('cutOut', () => {
  it('cuts the piece out of the photograph on a see-through ground', async () => {
    // A top with one strap: the piece is not a rectangle.
    const strap: Block = { ...TOP, top: 20, width: 40, height: 40 };
    const { photo, lift } = await scene(800, 600, [TOP, strap, SKIRT]);
    const boxes = [{ ...frac(TOP, 800, 600), y: 20 / 600, h: 200 / 600 }, frac(SKIRT, 800, 600)];
    const out = await cutOut(photo, lift, { route: 'on-device', index: 0, boxes });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const meta = await sharp(out.value.cutout).metadata();
    expect([meta.format, meta.hasAlpha, meta.width, meta.height]).toEqual(['webp', true, 200, 200]);
    // Beside the strap, the surface she laid it on is gone.
    expect((await pixel(out.value.cutout, 150, 10))[3]).toBe(0);
    // Her photograph's own pixels: the block's blue, fully there.
    const [r, g, b, a] = await pixel(out.value.cutout, 100, 120);
    expect(a).toBe(255);
    expect(Math.abs((r as number) - 0x20)).toBeLessThan(12);
    expect(Math.abs((g as number) - 0x40)).toBeLessThan(12);
    expect(Math.abs((b as number) - 0x80)).toBeLessThan(12);
    expect(out.value.shared).toBe(false);
  });

  it('gives the drawing step the same piece on white, with no transparency', async () => {
    const { photo, lift } = await scene(800, 600, [TOP]);
    const out = await cutOut(photo, lift, {
      route: 'on-device',
      index: 0,
      boxes: [frac(TOP, 800, 600)],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const meta = await sharp(out.value.reference).metadata();
    expect([meta.format, meta.hasAlpha]).toEqual(['jpeg', false]);
    expect(meta.width).toBeGreaterThan(200);
    const [r, g, b] = await pixel(out.value.reference, 2, 2);
    expect(Math.min(r as number, g as number, b as number)).toBeGreaterThan(245);
  });

  it('leaves the surface out: a piece that does not fill its box is see-through around it', async () => {
    // The lifted item is narrower than the box the read drew.
    const piece = { ...TOP, left: 140, width: 120 };
    const { photo, lift } = await scene(800, 600, [piece]);
    const out = await cutOut(photo, lift, {
      route: 'on-device',
      index: 0,
      boxes: [frac(TOP, 800, 600)],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Trimmed to the piece itself, not the box.
    expect((await sharp(out.value.cutout).metadata()).width).toBe(120);
  });

  it('reads a lift smaller than the photograph', async () => {
    const { photo, lift } = await scene(800, 600, [TOP, SKIRT], 0.5);
    const boxes = [frac(TOP, 800, 600), frac(SKIRT, 800, 600)];
    const out = await cutOut(photo, lift, { route: 'on-device', index: 1, boxes });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const meta = await sharp(out.value.cutout).metadata();
    expect([meta.width, meta.height]).toEqual([160, 240]);
    const [r, , , a] = await pixel(out.value.cutout, 80, 120);
    expect(a).toBe(255);
    expect(Math.abs((r as number) - 0xa0)).toBeLessThan(12);
  });

  it('splits two pieces lifted as one', async () => {
    const top: Block = { left: 300, top: 60, width: 200, height: 200, colour: '#f1ead8', item: 1 };
    const skirt: Block = {
      left: 300,
      top: 260,
      width: 200,
      height: 260,
      colour: '#f1ead8',
      item: 1,
    };
    const { photo, lift } = await scene(800, 600, [top, skirt]);
    const boxes = [frac(top, 800, 600), frac(skirt, 800, 600)];
    const a = await cutOut(photo, lift, { route: 'on-device', index: 0, boxes });
    const b = await cutOut(photo, lift, { route: 'on-device', index: 1, boxes });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.shared).toBe(true);
    const ha = (await sharp(a.value.cutout).metadata()).height as number;
    const hb = (await sharp(b.value.cutout).metadata()).height as number;
    // Each keeps its own share of the one lifted item; between them, all of it.
    expect(ha + hb).toBe(460);
    expect(Math.abs(ha - 200)).toBeLessThan(30);
  });

  it('says why when a piece keeps its rectangle', async () => {
    const { photo, lift } = await scene(800, 600, [TOP]);
    const elsewhere = { x: 0.6, y: 0.6, w: 0.3, h: 0.3 };
    expect(await cutOut(photo, lift, { route: 'on-device', index: 0, boxes: [elsewhere] })).toEqual(
      { ok: false, reason: 'miss' },
    );
    const tall = await scene(600, 800, [TOP]);
    expect(
      await cutOut(photo, tall.lift, {
        route: 'on-device',
        index: 0,
        boxes: [frac(TOP, 800, 600)],
      }),
    ).toEqual({ ok: false, reason: 'bad_lift' });
    expect(
      await cutOut(photo, photo, { route: 'on-device', index: 0, boxes: [frac(TOP, 800, 600)] }),
    ).toEqual({ ok: false, reason: 'bad_lift' });
    const speck: Block = { left: 100, top: 100, width: 30, height: 30, colour: '#000000', item: 1 };
    const small = await scene(800, 600, [speck]);
    expect(
      await cutOut(small.photo, small.lift, {
        route: 'on-device',
        index: 0,
        boxes: [frac(speck, 800, 600)],
      }),
    ).toEqual({ ok: false, reason: 'too_small' });
  });
});
