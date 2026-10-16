import { AdminMetricsInput } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { Text } from '@robes/ui';
import Link from 'next/link';
import { DataTable, money } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { metrics } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const RANGES = [7, 30] as const;
const pct = (part: number, whole: number): string =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : copy.empty;
const ms = (v: number | null): string => (v === null ? copy.empty : `${v} ms`);
const age = (s: number | null): string =>
  s === null ? copy.empty : s < 120 ? `${s} s` : `${Math.round(s / 60)} min`;

export default async function AdminMetrics({ searchParams }: Props) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const parsed = AdminMetricsInput.safeParse({
    days: typeof params.days === 'string' ? params.days : undefined,
  });
  const days = parsed.success ? parsed.data.days : 7;
  const m = await metrics(actor, days);
  const c = copy.metrics.columns;
  const f = m.funnel;
  const decided = m.deck.kept + m.deck.edited + m.deck.passed;
  return (
    <>
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.metrics.title(days)}
        actions={
          <nav aria-label={copy.metrics.range} className="flex gap-4">
            {RANGES.map((d) => (
              <Link
                key={d}
                href={`/admin/metrics?days=${d}`}
                aria-current={d === days ? 'page' : undefined}
                className="font-sans text-sm text-ink underline-offset-4 hover:underline aria-[current=page]:underline"
              >
                {copy.metrics.rangeOption(d)}
              </Link>
            ))}
          </nav>
        }
      />
      <Text size="small" tone="muted">
        {copy.metrics.note}
      </Text>
      <DataTable
        caption={copy.metrics.funnel}
        columns={[c.step, c.people, c.share]}
        rows={(['signedUp', 'firstPiece', 'firstSavedLook', 'returned'] as const).map((k) => [
          copy.metrics.steps[k],
          f[k],
          pct(f[k], f.signedUp),
        ])}
        empty={copy.metrics.none}
      />
      <DataTable
        caption={copy.metrics.daily}
        columns={[c.day, c.signups, c.active]}
        rows={[...m.daily].reverse().map((d) => [d.day, d.signups, d.active])}
        empty={copy.metrics.none}
      />
      <DataTable
        caption={copy.metrics.jobs}
        columns={[c.kind, c.total, c.succeeded, c.failed, c.failRate, c.p50, c.p95, c.spend]}
        rows={m.jobs.map((j) => [
          j.kind,
          j.total,
          j.succeeded,
          j.failed,
          pct(j.failed, j.total),
          ms(j.p50Ms),
          ms(j.p95Ms),
          money(j.costMicros),
        ])}
        empty={copy.metrics.none}
      />
      <DataTable
        caption={copy.metrics.queue}
        columns={[c.measure, c.value]}
        rows={[
          [copy.metrics.queueRows.queued, m.queue.queued],
          [copy.metrics.queueRows.running, m.queue.running],
          [copy.metrics.queueRows.oldest, age(m.queue.oldestQueuedSeconds)],
          [copy.metrics.queueRows.stale, m.queue.staleQueued],
          [copy.metrics.queueRows.expired, m.queue.expiredLeases],
        ]}
        empty={copy.metrics.none}
      />
      <DataTable
        caption={copy.metrics.deck}
        columns={[c.measure, c.value]}
        rows={[
          [copy.metrics.deckRows.kept, m.deck.kept],
          [copy.metrics.deckRows.edited, m.deck.edited],
          [copy.metrics.deckRows.passed, m.deck.passed],
          [copy.metrics.deckRows.waiting, m.deck.waiting],
          [copy.metrics.deckRows.keepRate, pct(m.deck.kept + m.deck.edited, decided)],
        ]}
        empty={copy.metrics.none}
      />
      <DataTable
        caption={copy.metrics.pieces}
        columns={[c.source, c.count]}
        rows={m.piecesBySource.map((r) => [r.source, r.n])}
        empty={copy.metrics.none}
      />
      <DataTable
        caption={copy.metrics.looks}
        columns={[c.source, c.count]}
        rows={m.looksBySource.map((r) => [r.source, r.n])}
        empty={copy.metrics.none}
      />
      <DataTable
        caption={copy.metrics.email}
        columns={[c.measure, c.value]}
        rows={(
          ['sent', 'failed', 'suppressed', 'bounces', 'complaints', 'unsubscribes'] as const
        ).map((k) => [copy.metrics.emailRows[k], m.email[k]])}
        empty={copy.metrics.none}
      />
    </>
  );
}
