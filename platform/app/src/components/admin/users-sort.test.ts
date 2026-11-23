import { describe, expect, it } from 'vitest';
import { sortHref, usersHref, usersView } from './users-sort';

describe('admin users sort', () => {
  it('reads the view from the URL, defaulting what is missing or unknown', () => {
    expect(usersView({})).toEqual({ email: undefined, sort: 'joined', dir: 'desc' });
    expect(usersView({ sort: 'name' })).toEqual({ email: undefined, sort: 'name', dir: 'asc' });
    expect(usersView({ sort: 'pieces', dir: 'asc', email: 'an' })).toEqual({
      email: 'an',
      sort: 'pieces',
      dir: 'asc',
    });
    expect(usersView({ sort: 'password', dir: 'sideways', email: ['a', 'b'] })).toEqual({
      email: undefined,
      sort: 'joined',
      dir: 'desc',
    });
  });

  it('flips the sorted column and starts another in its own direction', () => {
    const joined = usersView({});
    expect(sortHref(joined, 'joined')).toBe('/admin/users?dir=asc');
    expect(sortHref(joined, 'email')).toBe('/admin/users?sort=email');
    expect(sortHref(joined, 'looks')).toBe('/admin/users?sort=looks');
    const byEmail = usersView({ sort: 'email' });
    expect(sortHref(byEmail, 'email')).toBe('/admin/users?sort=email&dir=desc');
  });

  it('keeps the search when sorting and the sort when paging', () => {
    const view = usersView({ sort: 'lastActive', dir: 'asc', email: 'annie' });
    expect(sortHref(view, 'jobs')).toBe('/admin/users?email=annie&sort=jobs');
    expect(usersHref(view, 'abc')).toBe(
      '/admin/users?email=annie&sort=lastActive&dir=asc&cursor=abc',
    );
    expect(usersHref(usersView({}))).toBe('/admin/users');
  });
});
