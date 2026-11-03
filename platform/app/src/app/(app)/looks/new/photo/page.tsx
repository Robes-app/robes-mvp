import { z } from 'zod';
import { LookFromPhoto } from '@/components/photo-pieces/look-from-photo';

// The read runs inside the draft, so this page carries only the way back (in the top bar): the draft's own
// masthead names it (legacy 2b — it was never a screen of its own). `?day=` is the day she captured it
// for (design 3k's Capture Look).
export default async function LookFromPhotoPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const day = z.iso.date().safeParse((await searchParams).day).data ?? null;
  return (
    <div className="flex flex-col gap-4">
      <LookFromPhoto day={day} />
    </div>
  );
}
