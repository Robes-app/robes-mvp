import { AdminArtifactParams } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { Heading } from '@robes/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonBlock, when } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { artifact } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { params: Promise<{ id: string }> };

// shortcut: the output viewer shows the artifact as stored (one generic view for every type);
// a per-type rendering with her signed photos is the next step.
export default async function AdminArtifactPage({ params }: Props) {
  const actor = await requireAdmin();
  const parsed = AdminArtifactParams.safeParse(await params);
  if (!parsed.success) notFound();
  let a: Awaited<ReturnType<typeof artifact>>;
  try {
    a = await artifact(actor, parsed.data.id);
  } catch {
    notFound();
  }
  const f = copy.artifact.fields;
  const rows: [string, string][] = [
    [f.user, a.email],
    [f.type, a.type],
    [f.subtitle, a.subtitle || copy.empty],
    [f.created, when(a.createdAt, copy.empty)],
    [f.saved, when(a.savedAt, copy.empty)],
    [f.deleted, when(a.deletedAt, copy.empty)],
    [f.job, a.generationJobId ?? copy.empty],
    [f.version, String(a.schemaVersion)],
  ];
  return (
    <>
      <Link
        href={`/admin/users/${a.userId}`}
        className="font-sans text-sm text-ink underline underline-offset-4"
      >
        {copy.artifact.back}
      </Link>
      <PageHeader eyebrow={copy.artifact.eyebrow} title={a.title || a.type} />
      <dl className="grid grid-cols-[12rem_1fr] gap-x-4 gap-y-1 font-sans text-sm text-ink">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <section className="flex flex-col gap-2">
        <Heading level={2} size="lg">
          {copy.artifact.data}
        </Heading>
        <JsonBlock value={a.data} />
      </section>
    </>
  );
}
