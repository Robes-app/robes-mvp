import { lookbook, looks } from '@robes/copy';
import { z } from 'zod';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { Composer } from './composer';

const Search = z.object({ pieceId: z.uuid().optional() }).catch({});

export default async function NewLookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { pieceId } = Search.parse(await searchParams);
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/looks" label={looks.title} />
      <PageHeader eyebrow={lookbook.eyebrow.draft} title={lookbook.guide.title} />
      <Composer {...(pieceId ? { pieceId } : {})} />
    </div>
  );
}
