import {
  ADMIN_USER_SORTS,
  type AdminUserSort,
  adminUserSortDefaultDir,
  type SortDir,
} from '@robes/contracts';

export interface UsersView {
  email?: string | undefined;
  sort: AdminUserSort;
  dir: SortDir;
}

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

// The page's search params, with anything unknown dropped rather than failing the page.
export function usersView(params: Record<string, string | string[] | undefined>): UsersView {
  const s = one(params.sort);
  const sort = ADMIN_USER_SORTS.find((k) => k === s) ?? 'joined';
  const d = one(params.dir);
  const dir = d === 'asc' || d === 'desc' ? d : adminUserSortDefaultDir(sort);
  const email = one(params.email) || undefined;
  return { email, sort, dir };
}

// The URL for a view; a default sort or direction stays out of it.
export function usersHref(view: UsersView, cursor?: string): string {
  const q = new URLSearchParams();
  if (view.email) q.set('email', view.email);
  if (view.sort !== 'joined') q.set('sort', view.sort);
  if (view.dir !== adminUserSortDefaultDir(view.sort)) q.set('dir', view.dir);
  if (cursor) q.set('cursor', cursor);
  const s = q.toString();
  return s ? `/admin/users?${s}` : '/admin/users';
}

// A heading's link: the sorted column flips, any other starts in its own default direction.
// The search is kept; paging starts again from the top.
export function sortHref(view: UsersView, sort: AdminUserSort): string {
  const dir =
    view.sort === sort ? (view.dir === 'asc' ? 'desc' : 'asc') : adminUserSortDefaultDir(sort);
  return usersHref({ email: view.email, sort, dir });
}
