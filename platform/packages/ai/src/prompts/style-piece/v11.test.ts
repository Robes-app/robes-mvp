import { describe, expect, it } from 'vitest';
import * as v10 from './v10';
import { buildImagePrompt, buildSystem, normalisePieces, VERSION } from './v11';

const closet = [
  {
    id: 'c-tee',
    label: 'Cream raglan top',
    category: 'Tops',
    color: 'cream',
    brand: null,
    timesWorn: 0,
  },
  {
    id: 'c-knit',
    label: 'Yellow knit',
    category: 'Tops',
    color: 'yellow',
    brand: null,
    timesWorn: 0,
  },
  {
    id: 'c-cardi',
    label: 'Grey wool layer',
    category: 'Tops',
    categoryL2: 'Cardigans',
    color: 'grey',
    brand: null,
    timesWorn: 0,
  },
  {
    id: 'c-coat',
    label: 'Taupe tailored trench coat',
    category: 'Outerwear',
    color: 'taupe',
    brand: 'Camilla and Marc',
    timesWorn: 2,
    shape: ['Strong shoulder', 'Longline', 'Belted'],
  },
];
const ctx = {
  firstName: null,
  gender: 'woman' as const,
  styleIcons: [],
  closet,
  styleDna: {},
  wardrobeCount: closet.length,
};
const raw = (name: string, category: string, wardrobe_index = -1) => ({
  name,
  category,
  color: 'black',
  color_hex: '#000000',
  role: 'The Canvas',
  wardrobe_index,
});

describe('style-piece v11 (one top, shoes move on, shapes; 21 Nov)', () => {
  it('adds the top rule, the shoes rule and her pieces’ shapes after v10', () => {
    expect(VERSION).toBe(11);
    const system = buildSystem(ctx, 'dress-me', {}, null, { one: true });
    expect(system.startsWith(v10.buildSystem(ctx, 'dress-me', {}, null, { one: true }))).toBe(true);
    expect(system).toContain('ONE TOP — a look carries ONE top');
    expect(system).toContain('SHOES AND BAG MOVE ON');
    expect(system).toContain('THE SHAPE OF HER PIECES');
    expect(system).toContain('[3] Strong shoulder, Longline, Belted');
    expect(buildSystem({ ...ctx, closet: closet.slice(0, 2) }, 'piece')).not.toContain(
      'THE SHAPE OF HER PIECES',
    );
  });

  it('keeps one top, hers first, when the model lists two (21 Nov: a tee and a knit)', () => {
    const out = normalisePieces(
      [raw('Cream raglan top', 'Tops', 0), raw('Yellow knit', 'Tops', 1), raw('Jeans', 'Bottoms')],
      closet,
    );
    expect(out.map((p) => p.name)).toEqual(['Cream raglan top', 'Jeans']);
    const proposedFirst = normalisePieces(
      [raw('Black tee', 'Tops'), raw('Yellow knit', 'Tops', 1)],
      closet,
    );
    expect(proposedFirst.map((p) => p.name)).toEqual(['Yellow knit']);
  });

  it('keeps a layer worn over the top, read from its name or her filing', () => {
    const byL2 = normalisePieces(
      [
        raw('Cream raglan top', 'Tops', 0),
        raw('Grey wool layer', 'Tops', 2),
        raw('Yellow knit', 'Tops', 1),
      ],
      closet,
    );
    expect(byL2.map((p) => p.name)).toEqual(['Cream raglan top', 'Grey wool layer']);
    const byName = normalisePieces(
      [raw('White tee', 'Tops'), raw('Navy overshirt', 'Tops')],
      closet,
    );
    expect(byName.map((p) => p.name)).toEqual(['White tee', 'Navy overshirt']);
  });

  it('draws each piece from its photograph alone, with its shape and the layers in order', () => {
    const p = buildImagePrompt({
      wearer: 'woman',
      mode: 'dress-me',
      fallback: false,
      pieceLabel: null,
      hasModel: true,
      hasFace: true,
      hasPiecePhoto: false,
      styleIcons: [],
      brief: null,
      way: { title: 'Saturday', eyebrow: 'Weekend', scene: '' },
      setting: 'studio',
      pieces: [
        { name: 'Black turtleneck', category: 'Tops', color: 'black', brand: '', hasImage: true },
        {
          name: 'Taupe tailored trench coat',
          category: 'Outerwear',
          color: 'taupe',
          brand: 'Camilla and Marc',
          hasImage: true,
          shape: ['Strong shoulder', 'Longline'],
        },
      ],
    });
    expect(p).toContain(
      '- IMAGE 4: the Taupe tailored trench coat (taupe Outerwear by Camilla and Marc) — take ONLY this garment from that photograph',
    );
    expect(p).toContain('Its shape: Strong shoulder, Longline.');
    expect(p).toContain(
      'LAYERS, from the skin out: the Black turtleneck, then the Taupe tailored trench coat as the outer layer',
    );
  });
});
