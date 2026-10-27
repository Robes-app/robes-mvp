import { describe, expect, it } from 'vitest';
import {
  activeRoot,
  CREATE_ITEMS,
  createItems,
  GO_TO_ITEMS,
  isFlowPath,
  NAV_ITEMS,
  SOON_SLUGS,
} from './nav';

describe('nav', () => {
  it('has the four roots in the dock order', () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(['Today', 'Lookbook', 'Diary', 'Wardrobe']);
  });

  it('routes every unbuilt Create option to a known placeholder', () => {
    const soon = CREATE_ITEMS.filter((i) => i.href.startsWith('/soon/')).map((i) =>
      i.href.replace('/soon/', ''),
    );
    expect(soon.sort()).toEqual([...SOON_SLUGS].sort());
  });

  it('has unique command ids and destinations', () => {
    expect(new Set(CREATE_ITEMS.map((i) => i.id)).size).toBe(CREATE_ITEMS.length);
    // Pieces in first, then the stylist; Ask Robes is the new-look box in the sheet itself.
    expect(CREATE_ITEMS.map((i) => i.group)).toEqual([...CREATE_ITEMS.map((i) => i.group)].sort());
    expect(CREATE_ITEMS.some((i) => i.href.startsWith('/soon/'))).toBe(false);
    expect(new Set(GO_TO_ITEMS.map((i) => i.href)).size).toBe(GO_TO_ITEMS.length);
  });

  it('puts the Add pieces sheet’s doors in Create, every one built', () => {
    const add = CREATE_ITEMS.filter((i) => i.group === 'add');
    expect(add.map((i) => i.href)).toEqual([
      '/wardrobe/add?start=camera',
      '/wardrobe/add',
      '/wardrobe/link',
      '/wardrobe/receipt',
      '/wardrobe/manual',
    ]);
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

  it('stands the dock down in the add flow only', () => {
    expect(isFlowPath('/wardrobe/add')).toBe(true);
    expect(isFlowPath('/wardrobe/review')).toBe(true);
    expect(isFlowPath('/wardrobe/link')).toBe(true);
    expect(isFlowPath('/wardrobe/manual')).toBe(true);
    expect(isFlowPath('/wardrobe')).toBe(false);
    expect(isFlowPath('/wardrobe/additional')).toBe(false);
    expect(isFlowPath('/wardrobe/inbox')).toBe(false);
  });
});
