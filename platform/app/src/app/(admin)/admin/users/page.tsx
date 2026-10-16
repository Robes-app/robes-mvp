import { ListAdminUsersInput } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { buttonClasses, Field } from '@robes/ui';
import Link from 'next/link';
import { DataTable, when } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { listUsers } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminUsers({ searchParams }: Props) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const q = ListAdminUsersInput.parse({
    email: typeof params.email === 'string' && params.email ? params.email : undefined,
    cursor: typeof params.cursor === 'string' ? params.cursor : undefined,
  });
  const page = await listUsers(actor, q);
  const c = copy.users.columns;
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.users.title} />
      <form method="get" className="flex items-end gap-3">
        <Field label={copy.users.search} name="email" type="search" defaultValue={q.email ?? ''} />
        <button type="submit" className={buttonClasses({ variant: 'secondary' })}>
          {copy.users.searchAction}
        </button>
      </form>
      <DataTable
        caption={copy.users.title}
        columns={[c.email, c.name, c.joined, c.pieces, c.looks, c.jobs, c.lastActive]}
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
          href={`/admin/users?${new URLSearchParams({ ...(q.email ? { email: q.email } : {}), cursor: page.nextCursor })}`}
          className={`${buttonClasses({ variant: 'quiet' })} self-start`}
        >
          {copy.users.next}
        </Link>
      ) : null}
    </>
  );
}
