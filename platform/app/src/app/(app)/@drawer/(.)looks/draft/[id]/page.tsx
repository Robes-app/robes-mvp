import { notFound } from 'next/navigation';
import { DraftParams as Params, DraftSearch as Search } from '@/components/looks/draft-params';
import { DraftRoute } from '@/components/looks/draft-route';

// The draft as a drawer over whatever started it (D14): reached by a soft navigation from Home,
// the Lookbook, a piece or a saved look, this slot renders over the screen she was on. A hard
// load of the same address renders looks/draft/[id]/page.tsx instead.
export default async function DraftDrawer({
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
    <DraftRoute
      id={parsed.data.id}
      {...(search.pieceId ? { pieceId: search.pieceId } : {})}
      {...(search.day ? { day: search.day } : {})}
      {...(search.sheet ? { sheet: search.sheet } : {})}
      presentation="drawer"
    />
  );
}
