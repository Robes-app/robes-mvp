import { admin as copy } from '@robes/copy';
import Link from 'next/link';
import { DataTable, money } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { costs } from '@/server/admin';
import { requireAdmin } from '@/server/session';

export default async function AdminCosts() {
  const c = await costs(await requireAdmin(), 30);
  const col = copy.costs.columns;
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.costs.title} />
      <DataTable
        caption={copy.costs.budget}
        columns={[col.family, col.cost, col.limit, col.state]}
        rows={c.budget.map((b) => [
          b.modelFamily,
          money(b.costMicros),
          money(b.limitMicros),
          b.exhausted ? copy.costs.exhausted : copy.costs.open,
        ])}
        empty={copy.costs.none}
      />
      <DataTable
        caption={copy.costs.spenders}
        columns={[col.user, col.calls, col.cost]}
        rows={c.spenders.map((s) => [
          <Link key="u" href={`/admin/users/${s.id}`} className="underline underline-offset-4">
            {s.email}
          </Link>,
          s.calls,
          money(s.costMicros),
        ])}
        empty={copy.costs.none}
      />
      <DataTable
        caption={copy.costs.daily}
        columns={[col.day, col.feature, col.model, col.calls, col.cost]}
        rows={c.daily.map((d) => [d.day, d.feature, d.model, d.calls, money(d.costMicros)])}
        empty={copy.costs.none}
      />
    </>
  );
}
