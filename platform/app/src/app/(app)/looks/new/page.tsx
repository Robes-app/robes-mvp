import { z } from 'zod';
import { NewDraft } from '@/components/looks/draft-page';

const Search = z.object({ pieceId: z.uuid().optional() }).catch({});

export default async function NewLookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { pieceId } = Search.parse(await searchParams);
  return (
    <div className="flex flex-col gap-4">
      <NewDraft {...(pieceId ? { pieceId } : {})} />
    </div>
  );
}
