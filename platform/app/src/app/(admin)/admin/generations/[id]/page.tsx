import { AdminCallParams } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonBlock, money, when } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { generationCall } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { params: Promise<{ id: string }> };

// One model call, prompt and response included: opening it is the audited read.
export default async function AdminCall({ params }: Props) {
  const actor = await requireAdmin();
  const parsed = AdminCallParams.safeParse(await params);
  if (!parsed.success) notFound();
  let call: Awaited<ReturnType<typeof generationCall>>;
  try {
    call = await generationCall(actor, parsed.data.id);
  } catch {
    notFound();
  }
  const f = copy.call.fields;
  const rows: [string, string][] = [
    [f.user, call.email ?? copy.empty],
    [f.feature, call.feature],
    [f.model, call.model],
    [f.status, call.status],
    [f.latency, call.latencyMs === null ? copy.empty : `${call.latencyMs} ms`],
    [f.cost, money(call.costMicros)],
    [f.tokens, `${call.tokensIn ?? copy.empty} / ${call.tokensOut ?? copy.empty}`],
    [f.images, String(call.images)],
    [f.job, call.jobId ?? copy.empty],
    [f.when, when(call.createdAt, copy.empty)],
  ];
  return (
    <>
      {call.userId ? (
        <Link
          href={`/admin/users/${call.userId}`}
          className="font-sans text-sm text-ink underline underline-offset-4"
        >
          {copy.call.back}
        </Link>
      ) : null}
      <PageHeader eyebrow={copy.call.eyebrow} title={call.feature} />
      <dl className="grid grid-cols-[12rem_1fr] gap-x-4 gap-y-1 font-sans text-sm text-ink">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {[
        [copy.call.prompt, call.prompt],
        [copy.call.response, call.response],
        [copy.call.detail, call.detail],
      ].map(([label, value]) => (
        <section key={String(label)} className="flex flex-col gap-2">
          <Heading level={2} size="lg">
            {String(label)}
          </Heading>
          {value === null || value === undefined ? (
            <Text>{copy.call.cleared}</Text>
          ) : (
            <JsonBlock value={value} />
          )}
        </section>
      ))}
    </>
  );
}
