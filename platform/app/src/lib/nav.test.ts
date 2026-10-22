import { describe, expect, it } from 'vitest';
import { activeRoot, CREATE_ITEMS, createItems, GO_TO_ITEMS, NAV_ITEMS, SOON_SLUGS } from './nav';

describe('nav', () => {
  it('has the four roots in IA order', () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(['Today', 'Wardrobe', 'Lookbook', 'Diary']);
  });

  it('routes every unbuilt Create option to a known placeholder', () => {
    const soon = CREATE_ITEMS.filter((i) => i.href.startsWith('/soon/')).map((i) =>
      i.href.replace('/soon/', ''),
    );
    expect(soon.sort()).toEqual([...SOON_SLUGS].sort());
  });

  it('has unique command ids and destinations', () => {
    expect(new Set(CREATE_ITEMS.map((i) => i.id)).size).toBe(CREATE_ITEMS.length);
    // Pieces in first, then the stylist; Ask Robes wears the sparkle, never a chat bubble.
    expect(CREATE_ITEMS.map((i) => i.group)).toEqual([...CREATE_ITEMS.map((i) => i.group)].sort());
    expect(CREATE_ITEMS.find((i) => i.id === 'ask')?.icon).toBe('looks');
    expect(new Set(GO_TO_ITEMS.map((i) => i.href)).size).toBe(GO_TO_ITEMS.length);
  });

  it('drops the trip door while trips are hidden', () => {
    expect(createItems({ trips: false }).map((i) => i.id)).not.toContain('trip');
    expect(createItems({ trips: true }).map((i) => i.id)).toContain('trip');
  });

  it('marks the owning root for nested pages', () => {
    expect(activeRoot('/')).toBe('/');
    expect(activeRoot('/wardrobe/inbox')).toBe('/wardrobe');
    expect(activeRoot('/piece/abc')).toBe('/wardrobe');
    expect(activeRoot('/looks/ideas/abc')).toBe('/looks');
    expect(activeRoot('/you')).toBe('');
  });
});
