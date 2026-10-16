import { admin as copy } from '@robes/copy';
import { DataTable } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { health } from '@/server/admin';
import { requireAdmin } from '@/server/session';

export default async function AdminOverview() {
  const h = await health(await requireAdmin());
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.overview.title} />
      <DataTable
        caption={copy.overview.counts}
        columns={[copy.user.jobColumns.kind, copy.user.jobColumns.status, copy.users.columns.jobs]}
        rows={h.counts.map((c) => [c.kind, c.status, c.n])}
        empty={copy.overview.none}
      />
      <DataTable
        caption={copy.overview.durations}
        columns={[copy.user.jobColumns.kind, 'p50', 'p95']}
        rows={h.durations.map((d) => [
          d.kind,
          d.p50Ms === null ? copy.empty : `${d.p50Ms} ms`,
          d.p95Ms === null ? copy.empty : `${d.p95Ms} ms`,
        ])}
        empty={copy.overview.none}
      />
      <DataTable
        caption={copy.overview.errors}
        columns={[copy.user.jobColumns.kind, copy.user.jobColumns.error, copy.users.columns.jobs]}
        rows={h.errors.map((e) => [e.kind, e.error, e.n])}
        empty={copy.overview.none}
      />
    </>
  );
}
