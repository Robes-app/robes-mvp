import { describe, expect, it, vi } from 'vitest';
import { localPreview, rememberPreview } from './local-previews';

describe('local previews', () => {
  it('keeps one object URL per asset until the renditions land', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:her-photo');
    rememberPreview('a1', new Blob(['x']));
    rememberPreview('a1', new Blob(['y']));
    expect(create).toHaveBeenCalledOnce();
    expect(localPreview('a1')).toBe('blob:her-photo');
    expect(localPreview('a2')).toBeNull();
    expect(localPreview(undefined)).toBeNull();
  });
});
