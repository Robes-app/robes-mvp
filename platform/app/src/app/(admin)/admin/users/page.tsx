import { type AdminUserSort, adminUserSortDefaultDir, ListAdminUsersInput } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { buttonClasses, Field } from '@robes/ui';
import Link from 'next/link';
import { DataTable, when } from '@/components/admin/table';
import { sortHref, usersHref, usersView } from '@/components/admin/users-sort';
import { PageHeader } from '@/components/page-header';
import { listUsers } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminUsers({ searchParams }: Props) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const view = usersView(params);
  const q = ListAdminUsersInput.parse({
    ...view,
    cursor: typeof params.cursor === 'string' ? params.cursor : undefined,
  });
  const page = await listUsers(actor, q);
  const c = copy.users.columns;
  const column = (label: string, sort: AdminUserSort) => ({
    label,
    href: sortHref(view, sort),
    sorted: view.sort === sort ? view.dir : undefined,
  });
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.users.title} />
      <form method="get" className="flex items-end gap-3">
        <Field label={copy.users.search} name="email" type="search" defaultValue={q.email ?? ''} />
        {/* A search keeps the sort she chose. */}
        {view.sort !== 'joined' ? <input type="hidden" name="sort" value={view.sort} /> : null}
        {view.dir !== adminUserSortDefaultDir(view.sort) ? (
          <input type="hidden" name="dir" value={view.dir} />
        ) : null}
        <button type="submit" className={buttonClasses({ variant: 'outline' })}>
          {copy.users.searchAction}
        </button>
      </form>
      <DataTable
        caption={copy.users.title}
        columns={[
          column(c.email, 'email'),
          column(c.name, 'name'),
          column(c.joined, 'joined'),
          column(c.pieces, 'pieces'),
          column(c.looks, 'looks'),
          column(c.jobs, 'jobs'),
          column(c.lastActive, 'lastActive'),
        ]}
        rows={page.items.map((u) => [
          <Link key="e" href={`/admin/users/${u.id}`} className="underline underline-offset-4">
            {u.email}
          </Link>,
          u.name || copy.empty,
          when(u.createdAt, copy.empty),
          u.pieces,
          u.looks,
          u.jobs,
          when(u.lastActiveAt, copy.empty),
        ])}
        empty={copy.users.empty}
      />
      {page.nextCursor ? (
        <Link
          href={usersHref(view, page.nextCursor)}
          className={`${buttonClasses({ variant: 'quiet' })} self-start`}
        >
          {copy.users.next}
        </Link>
      ) : null}
    </>
  );
}
