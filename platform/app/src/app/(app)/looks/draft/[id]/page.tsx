import { notFound } from 'next/navigation';
import { DraftParams as Params, DraftSearch as Search } from '@/components/looks/draft-params';
import { DraftRoute } from '@/components/looks/draft-route';

// A draft on its own page: a deep link, or a refresh with no screen beneath the drawer.
export default async function DraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = Params.safeParse(await params);
  if (!parsed.success) notFound();
  const search = Search.parse(await searchParams);
  return (
    <div className="flex flex-col gap-4">
      <DraftRoute
        id={parsed.data.id}
        {...(search.pieceId ? { pieceId: search.pieceId } : {})}
        {...(search.day ? { day: search.day } : {})}
        {...(search.sheet ? { sheet: search.sheet } : {})}
        presentation="page"
      />
    </div>
  );
}
