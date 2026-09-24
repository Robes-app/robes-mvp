import { ListAuditInput } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { buttonClasses } from '@robes/ui';
import Link from 'next/link';
import { DataTable, when } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { auditLog } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAudit({ searchParams }: Props) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const parsed = ListAuditInput.safeParse({
    userId: typeof params.userId === 'string' ? params.userId : undefined,
    cursor: typeof params.cursor === 'string' ? params.cursor : undefined,
  });
  const q = parsed.success ? parsed.data : ListAuditInput.parse({});
  const page = await auditLog(actor, q);
  const c = copy.audit.columns;
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.audit.title} />
      <DataTable
        caption={copy.audit.title}
        columns={[c.when, c.actor, c.action, c.subject, c.ip]}
        rows={page.items.map((a) => [
          when(a.createdAt, copy.empty),
          a.actorEmail ?? copy.empty,
          a.action,
          a.subjectUserId ? (
            <Link
              key="s"
              href={`/admin/users/${a.subjectUserId}`}
              className="underline underline-offset-4"
            >
              {a.subjectId ?? a.subjectUserId}
            </Link>
          ) : (
            (a.subjectId ?? copy.empty)
          ),
          a.ip ?? copy.empty,
        ])}
        empty={copy.audit.empty}
      />
      {page.nextCursor ? (
        <Link
          href={`/admin/audit?${new URLSearchParams({ ...(q.userId ? { userId: q.userId } : {}), cursor: page.nextCursor })}`}
          className={`${buttonClasses({ variant: 'quiet' })} self-start`}
        >
          {copy.audit.next}
        </Link>
      ) : null}
    </>
  );
}
