import { AdminUserParams } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, money, Thumb, when } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { userDetail, userRecords } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { params: Promise<{ id: string }> };

export default async function AdminUser({ params }: Props) {
  const actor = await requireAdmin();
  const parsed = AdminUserParams.safeParse(await params);
  if (!parsed.success) notFound();
  let u: Awaited<ReturnType<typeof userDetail>>;
  let r: Awaited<ReturnType<typeof userRecords>>;
  try {
    [u, r] = await Promise.all([
      userDetail(actor, parsed.data.id),
      userRecords(actor, parsed.data.id),
    ]);
  } catch {
    notFound();
  }
  const rc = copy.user.records;
  const c = rc.columns;
  const link = (href: string, label: string) => (
    <Link key={href} href={href} className="underline underline-offset-4">
      {label}
    </Link>
  );
  const rating = (n: number | null) =>
    n === null ? rc.ratings.none : n > 0 ? rc.ratings.up : rc.ratings.down;
  const f = copy.user.fields;
  const j = copy.user.jobColumns;
  const profile: [string, string][] = [
    [f.email, u.email],
    [f.firstName, u.firstName ?? copy.empty],
    [f.lastName, u.lastName ?? copy.empty],
    [f.timezone, u.timezone],
    [f.locale, u.locale],
    [f.joined, when(u.createdAt, copy.empty)],
    [f.onboarded, when(u.onboardedAt, copy.empty)],
    [copy.user.role, u.role ?? copy.user.none],
  ];
  return (
    <>
      <Link href="/admin/users" className="font-sans text-sm text-ink underline underline-offset-4">
        {copy.user.back}
      </Link>
      <PageHeader eyebrow={copy.eyebrow} title={u.firstName || u.name || u.email} />
      <section className="flex flex-col gap-2">
        <Heading level={2} size="lg">
          {copy.user.profile}
        </Heading>
        <dl className="grid grid-cols-[12rem_1fr] gap-x-4 gap-y-1 font-sans text-sm text-ink">
          {profile.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <DataTable
        caption={copy.user.consents}
        columns={[j.kind, j.status, j.started]}
        rows={u.consents.map((c) => [c.kind, String(c.granted), when(c.at, copy.empty)])}
        empty={copy.user.none}
      />
      <DataTable
        caption={copy.user.usage}
        columns={[j.kind, copy.users.columns.jobs]}
        rows={u.usageToday.map((x) => [x.metric, x.count])}
        empty={copy.user.none}
      />
      <DataTable
        caption={copy.user.jobs}
        columns={[j.kind, j.status, j.error, j.started, j.duration]}
        rows={u.jobs.map((x) => [
          x.kind,
          x.status,
          x.error ?? copy.empty,
          when(x.createdAt, copy.empty),
          x.durationMs === null ? copy.empty : `${x.durationMs} ms`,
        ])}
        empty={copy.user.none}
      />
      <DataTable
        caption={rc.pieces(r.pieces.length, r.pieceCount)}
        columns={[c.photo, c.name, c.category, c.brand, c.colour, c.via, c.wears, c.when]}
        rows={r.pieces.map((p) => [
          <Thumb key="t" src={p.image} empty={rc.noPhoto} />,
          p.hero ? `${p.label} · ${rc.hero}` : p.label,
          p.category,
          p.brand ?? copy.empty,
          p.colourShade ?? copy.empty,
          p.acquiredVia,
          p.wears,
          when(p.createdAt, copy.empty),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.looks}
        columns={[c.photo, c.name, c.status, c.source, c.pieces, c.toFind, c.wears, c.when]}
        rows={r.looks.map((l) => [
          <Thumb key="t" src={l.image} empty={rc.noPhoto} />,
          l.name,
          l.status,
          l.source,
          l.pieces,
          l.proposals,
          rc.worn(l.wears, l.lastWornOn),
          when(l.createdAt, copy.empty),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.artifacts}
        columns={[c.type, c.title, c.status, c.when]}
        rows={r.artifacts.map((a) => [
          a.type,
          link(`/admin/artifacts/${a.id}`, a.title || a.type),
          a.saved ? rc.saved : rc.unsaved,
          when(a.createdAt, copy.empty),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.wishlist}
        columns={[c.photo, c.name, c.brand, c.source, c.price, c.status, c.when]}
        rows={r.wishlist.map((w) => [
          <Thumb key="t" src={w.image} empty={rc.noPhoto} />,
          w.label,
          w.brand ?? copy.empty,
          w.sourceType,
          w.price ?? copy.empty,
          w.bought ? rc.bought : copy.empty,
          when(w.createdAt, copy.empty),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.feedback}
        columns={[c.rating, c.note, c.about, c.when]}
        rows={r.feedback.map((f) => [
          rating(f.rating),
          f.note ?? copy.empty,
          [f.subjectType, f.track].filter(Boolean).join(' · '),
          when(f.createdAt, copy.empty),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.memory}
        columns={[c.kind, c.surface, c.text, c.rating, c.when]}
        rows={r.memory.map((m) => [
          m.kind,
          m.surface ?? copy.empty,
          m.text ?? copy.empty,
          m.verdict === null ? copy.empty : rating(m.verdict),
          when(m.createdAt, copy.empty),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.brief}
        columns={[c.list, c.status, c.text, c.because, c.source]}
        rows={r.brief.map((b) => [b.list, b.state, b.text, b.because ?? copy.empty, b.source])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.calls}
        columns={[c.feature, c.model, c.status, c.latency, c.cost, c.when, rc.prompt]}
        rows={r.calls.map((x) => [
          x.feature,
          x.model,
          x.status,
          x.latencyMs === null ? copy.empty : `${x.latencyMs} ms`,
          money(x.costMicros),
          when(x.createdAt, copy.empty),
          link(`/admin/generations/${x.id}`, x.hasPrompt ? rc.open : rc.cleared),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.notifications}
        columns={[c.kind, c.channel, c.status, c.when]}
        rows={r.notifications.map((n) => [n.kind, n.channel, n.status, when(n.sentAt, copy.empty)])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.inbox}
        columns={[c.retailer, c.status, c.items, c.filed, c.when]}
        rows={r.inbox.map((i) => [
          i.retailer ?? copy.empty,
          i.status,
          i.items,
          i.filedTo ? `${i.filed} · ${i.filedTo}` : i.filed,
          when(i.receivedAt, copy.empty),
        ])}
        empty={rc.none}
      />
      <DataTable
        caption={rc.events}
        columns={[c.event, c.when]}
        rows={r.events.map((e) => [e.eventType, when(e.createdAt, copy.empty)])}
        empty={rc.none}
      />
      <section className="flex flex-col gap-2">
        <Heading level={2} size="lg">
          {copy.user.deletion}
        </Heading>
        <Text>
          {u.deletion
            ? `${u.deletion.status} · ${when(u.deletion.requestedAt, copy.empty)}`
            : copy.user.noDeletion}
        </Text>
      </section>
      <Link
        href={`/admin/audit?userId=${u.id}`}
        className="font-sans text-sm text-ink underline underline-offset-4"
      >
        {copy.user.auditTrail}
      </Link>
    </>
  );
}
