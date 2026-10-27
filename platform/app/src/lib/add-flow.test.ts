import { describe, expect, it } from 'vitest';
import { destinationOf, isPhoto, wardrobeHref } from './add-flow';

describe('add flow', () => {
  it('carries where the pieces go, and anything else lands in the wardrobe', () => {
    expect(destinationOf('wishlist')).toBe('wishlist');
    expect(destinationOf('wardrobe')).toBe('wardrobe');
    expect(destinationOf('elsewhere')).toBe('wardrobe');
    expect(destinationOf(undefined)).toBe('wardrobe');
  });

  it('sends her on to where the pieces went', () => {
    expect(wardrobeHref('wardrobe')).toBe('/wardrobe');
    expect(wardrobeHref('wishlist')).toBe('/wardrobe/wishlist');
  });

  it('reads only the photo types the upload takes', () => {
    expect(isPhoto(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isPhoto(new File([''], 'a.heic', { type: 'image/heic' }))).toBe(false);
    expect(isPhoto(new File([''], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
  });
});
