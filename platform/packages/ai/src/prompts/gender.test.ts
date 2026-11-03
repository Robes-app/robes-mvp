import { describe, expect, it } from 'vitest';
import { buildSystem as dailySystem, GENDER_DIRECTIVE } from './daily/v1';
import { NON_BINARY_DIRECTIVE } from './gender';
import { genderBlock, wearerRule } from './style-piece/v1';
import { genderDirective } from './style-piece/v3';
import { buildSystem as styleSystem } from './style-piece/v4';

const ctx = {
  firstName: null,
  styleIcons: [],
  closet: [],
  styleDna: {},
  wardrobeCount: 0,
};

describe('a non-binary profile in every stylist prompt', () => {
  it('styles across menswear and womenswear, never one side by default', () => {
    expect(NON_BINARY_DIRECTIVE).toContain('across menswear and womenswear');
    expect(genderDirective('non_binary')).toBe(NON_BINARY_DIRECTIVE);
    expect(genderBlock('non_binary')).toBe(NON_BINARY_DIRECTIVE);
    expect(GENDER_DIRECTIVE.non_binary).toBe(NON_BINARY_DIRECTIVE);
    expect(dailySystem({ ...ctx, gender: 'non_binary' })).toContain(NON_BINARY_DIRECTIVE);
  });

  it('lets the model judge whose figure stands in each frame', () => {
    expect(wearerRule('non_binary')).toBe(wearerRule('unspecified'));
    expect(styleSystem({ ...ctx, gender: 'non_binary' }, 'piece')).toContain('Set "wearer"');
    expect(styleSystem({ ...ctx, gender: 'woman' }, 'piece')).not.toContain('Set "wearer"');
  });

  it('leaves the other genders’ directives as they were', () => {
    expect(genderDirective('woman')).toBe(
      'The user is a woman (from her profile): every piece and look is womenswear.',
    );
    expect(genderDirective('unspecified')).not.toContain('non-binary');
  });
});
