import { lookbook, looks, photoPieces } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import Link from 'next/link';
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
      <h1 className="sr-only">{lookbook.newLook}</h1>
      <Composer {...(pieceId ? { pieceId } : {})} />
    </div>
  );
}
