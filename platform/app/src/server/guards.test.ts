import { describe, expect, it } from 'vitest';
import { isAuthPage, isProtectedPath, safeNext } from './guards';

describe('guards', () => {
  it('protects app areas by prefix, not substring', () => {
    expect(isProtectedPath('/wardrobe')).toBe(true);
    expect(isProtectedPath('/wardrobe/inbox')).toBe(true);
    expect(isProtectedPath('/wardrobes-for-sale')).toBe(false);
    expect(isProtectedPath('/')).toBe(false);
    expect(isAuthPage('/auth/sign-in')).toBe(true);
  });

  it('never redirects off-site after sign-in', () => {
    expect(safeNext('/wardrobe?x=1')).toBe('/wardrobe?x=1');
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', '', null, 'wardrobe']) {
      expect(safeNext(bad)).toBe('/');
    }
  });
});
