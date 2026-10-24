import { ListAdminFeedbackInput } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { buttonClasses } from '@robes/ui';
import Link from 'next/link';
import { DataTable, when } from '@/components/admin/table';
import { PageHeader } from '@/components/page-header';
import { feedbackFeed } from '@/server/admin';
import { requireAdmin } from '@/server/session';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminFeedback({ searchParams }: Props) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const parsed = ListAdminFeedbackInput.safeParse({
    cursor: typeof params.cursor === 'string' ? params.cursor : undefined,
  });
  const page = await feedbackFeed(actor, parsed.success ? parsed.data : { limit: 50 });
  const c = copy.feedback.columns;
  const r = copy.user.records.ratings;
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.feedback.title} />
      <DataTable
        caption={copy.feedback.title}
        columns={[c.when, c.user, c.rating, c.note, c.about]}
        rows={page.items.map((f) => [
          when(f.createdAt, copy.empty),
          f.userId ? (
            <Link
              key="u"
              href={`/admin/users/${f.userId}`}
              className="underline underline-offset-4"
            >
              {f.email ?? f.userId}
            </Link>
          ) : (
            copy.empty
          ),
          f.rating === null ? r.none : f.rating > 0 ? r.up : r.down,
          f.note ?? copy.empty,
          [f.subjectType, f.track].filter(Boolean).join(' · '),
        ])}
        empty={copy.feedback.empty}
      />
      {page.nextCursor ? (
        <Link
          href={`/admin/feedback?${new URLSearchParams({ cursor: page.nextCursor })}`}
          className={`${buttonClasses({ variant: 'quiet' })} self-start`}
        >
          {copy.feedback.next}
        </Link>
      ) : null}
    </>
  );
}
