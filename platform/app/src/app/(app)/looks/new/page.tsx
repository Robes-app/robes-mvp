import { redirect } from 'next/navigation';
import { z } from 'zod';

const Search = z.object({ pieceId: z.uuid().optional() }).catch({});

// The old address of a new draft (legacy mails, the Create menu): the draft drawer took it (D14).
export default async function NewLookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { pieceId } = Search.parse(await searchParams);
  redirect(`/looks/draft/new${pieceId ? `?pieceId=${pieceId}` : ''}`);
}
