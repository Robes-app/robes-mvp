import { photoSource } from './photo-source';

test('caches a signed photo by its address, not its signature', () => {
  const a = photoSource('https://media.byrobes.com/media/u/a/640.webp?Expires=1&Signature=x');
  const b = photoSource('https://media.byrobes.com/media/u/a/640.webp?Expires=2&Signature=y');
  expect(a.cacheKey).toBe('https://media.byrobes.com/media/u/a/640.webp');
  expect(b.cacheKey).toBe(a.cacheKey);
  expect(a.uri).toContain('Signature=x');
  expect(photoSource('file:///tmp/shot.jpg')).toEqual({ uri: 'file:///tmp/shot.jpg' });
  expect(photoSource('https://media.byrobes.com/a.webp')).toEqual({
    uri: 'https://media.byrobes.com/a.webp',
  });
});
