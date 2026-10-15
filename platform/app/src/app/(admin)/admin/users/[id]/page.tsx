import { AdminUserParams } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, when } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { userDetail } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { params: Promise<{ id: string }> };

export default async function AdminUser({ params }: Props) {
  const actor = await requireAdmin();
  const parsed = AdminUserParams.safeParse(await params);
  if (!parsed.success) notFound();
  let u: Awaited<ReturnType<typeof userDetail>>;
  try {
    u = await userDetail(actor, parsed.data.id);
  } catch {
    notFound();
  }
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
