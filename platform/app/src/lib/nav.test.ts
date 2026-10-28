import { describe, expect, it } from 'vitest';
import {
  activeRoot,
  backFor,
  CREATE_ITEMS,
  createItems,
  GO_TO_ITEMS,
  isFlowPath,
  isSettingsPath,
  NAV_ITEMS,
  SOON_SLUGS,
} from './nav';

describe('nav', () => {
  it('has the four roots in the dock order', () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(['Home', 'Lookbook', 'Diary', 'Wardrobe']);
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

  it('gives Settings its own chrome on /you and its pages only', () => {
    expect(isSettingsPath('/you')).toBe(true);
    expect(isSettingsPath('/you/model/body')).toBe(true);
    expect(isSettingsPath('/young')).toBe(false);
    expect(isSettingsPath('/')).toBe(false);
  });
});

describe('backFor', () => {
  const q = (s = '') => new URLSearchParams(s);

  it('gives the day page its month, or Today when it came from Today', () => {
    expect(backFor('/plan/2026-10-28', q())).toEqual({ href: '/plan', label: 'October 2026' });
    expect(backFor('/plan/2026-10-28', q('from=today'))).toEqual({ href: '/', label: 'Today' });
    expect(backFor('/plan/2026-13-01', q())).toBeNull();
  });

  it('names the previous screen on every pushed page', () => {
    const id = '0b9f4c1e-0000-4000-8000-000000000000';
    expect(backFor(`/look/${id}`, q())).toEqual({ href: '/looks', label: 'Lookbook' });
    expect(backFor('/looks/new', q())?.href).toBe('/looks');
    expect(backFor('/looks/new/photo', q())?.href).toBe('/looks');
    expect(backFor(`/looks/ideas/${id}`, q())?.href).toBe('/looks/ideas');
    expect(backFor(`/piece/${id}`, q())).toEqual({ href: '/wardrobe', label: 'Wardrobe' });
    expect(backFor('/wardrobe/inbox', q())?.href).toBe('/wardrobe');
    expect(backFor('/wardrobe/add', q())?.href).toBe('/wardrobe');
    expect(backFor('/wardrobe/receipt', q())?.href).toBe('/wardrobe/add');
  });

  it('keeps the add destination, and only a known one', () => {
    expect(backFor('/wardrobe/link', q('to=wishlist'))?.href).toBe('/wardrobe/add?to=wishlist');
    expect(backFor('/wardrobe/manual', q('to=elsewhere'))?.href).toBe('/wardrobe/add?to=wardrobe');
  });

  it('backs a styling job out to Home only when it started there', () => {
    expect(backFor('/looks/style/abc', q('from=home'))).toEqual({ href: '/', label: 'Home' });
    expect(backFor('/looks/style/abc', q())).toBeNull();
  });

  it('leaves the roots their wordmark', () => {
    for (const root of [
      '/',
      '/looks',
      '/plan',
      '/wardrobe',
      '/wardrobe/wishlist',
      '/looks/style',
    ]) {
      expect(backFor(root, q())).toBeNull();
    }
  });
});
