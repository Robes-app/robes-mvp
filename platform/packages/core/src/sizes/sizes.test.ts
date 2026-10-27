import { describe, expect, it } from 'vitest';
import {
  convertUkSize,
  formatUkSize,
  parseUkSize,
  sizeSystemFor,
  stepUkSize,
  ukSizeBounds,
} from './index';

describe('the size system follows the category', () => {
  it('steps shoes on the shoe scale and clothing on the dress scale', () => {
    expect(sizeSystemFor({ categoryL2: 'Trainers', category: 'Shoes' })).toBe('shoe');
    expect(sizeSystemFor({ category: 'Shoes' })).toBe('shoe');
    expect(sizeSystemFor({ categoryL2: 'Jumpers & sweaters' })).toBe('clothing');
    expect(sizeSystemFor({ categoryL2: null, category: 'Outerwear' })).toBe('clothing');
    expect(sizeSystemFor({ category: 'Dresses & jumpsuits' })).toBe('clothing');
  });

  it('leaves anything else to be typed', () => {
    expect(sizeSystemFor({ category: 'Bags' })).toBe('plain');
    expect(sizeSystemFor({ category: 'Accessories' })).toBe('plain');
    expect(sizeSystemFor({ category: 'Jewellery' })).toBe('plain');
    expect(sizeSystemFor({})).toBe('plain');
    expect(sizeSystemFor({ categoryL2: null, category: null })).toBe('plain');
  });
});

describe('a size on the scale', () => {
  it('reads what is filed, with or without its UK', () => {
    expect(parseUkSize('clothing', 'UK 12')).toBe(12);
    expect(parseUkSize('clothing', '12')).toBe(12);
    expect(parseUkSize('clothing', ' uk14 ')).toBe(14);
    expect(parseUkSize('shoe', 'UK 5.5')).toBe(5.5);
    expect(parseUkSize('shoe', '5,5')).toBe(5.5);
  });

  it('keeps a size typed another way as hers, not a step', () => {
    expect(parseUkSize('clothing', 'M')).toBeNull();
    expect(parseUkSize('clothing', 'W28 L30')).toBeNull();
    expect(parseUkSize('clothing', 'UK 11')).toBeNull();
    expect(parseUkSize('clothing', 'UK 40')).toBeNull();
    expect(parseUkSize('shoe', 'UK 5.25')).toBeNull();
    expect(parseUkSize('plain', 'UK 12')).toBeNull();
    expect(parseUkSize('clothing', null)).toBeNull();
    expect(parseUkSize('clothing', '')).toBeNull();
  });

  it('files as "UK n"', () => {
    expect(formatUkSize(12)).toBe('UK 12');
    expect(formatUkSize(5.5)).toBe('UK 5.5');
  });

  it('starts from the scale default and never leaves the scale', () => {
    expect(stepUkSize('clothing', null, 1)).toBe(10);
    expect(stepUkSize('clothing', null, -1)).toBe(10);
    expect(stepUkSize('clothing', 12, 1)).toBe(14);
    expect(stepUkSize('clothing', 12, -1)).toBe(10);
    expect(stepUkSize('clothing', 4, -1)).toBe(4);
    expect(stepUkSize('clothing', 26, 1)).toBe(26);
    expect(stepUkSize('shoe', null, 1)).toBe(5);
    expect(stepUkSize('shoe', 5, 1)).toBe(5.5);
    expect(stepUkSize('shoe', 10, 1)).toBe(10);
    expect(ukSizeBounds('shoe')).toEqual({ min: 2, max: 10, start: 5 });
  });

  it('converts live: dress UK 12 is EU 40, US 8; shoe UK 5 is EU 38, US 7', () => {
    expect(convertUkSize('clothing', 12)).toEqual({ eu: 40, us: 8 });
    expect(convertUkSize('clothing', 4)).toEqual({ eu: 32, us: 0 });
    expect(convertUkSize('shoe', 5)).toEqual({ eu: 38, us: 7 });
    expect(convertUkSize('shoe', 6.5)).toEqual({ eu: 39.5, us: 8.5 });
  });
});
