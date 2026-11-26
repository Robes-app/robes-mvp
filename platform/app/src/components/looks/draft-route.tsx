'use client';

import { useRouter } from 'next/navigation';
import { DraftLook, type DraftPresentation } from './draft-look';

// The draft's route, as a drawer over the screen that opened it (the intercepting route under
// app/(app)/@drawer) or as a page on a deep link. Closing a drawer goes back; a page with nothing
// behind it goes to the Lookbook.
export function DraftRoute({
  id,
  pieceId,
  day,
  images,
  pick,
  job,
  from,
  fromWish = false,
  presentation,
}: {
  id: string;
  pieceId?: string;
  day?: string;
  images?: 'add';
  pick?: boolean;
  // Style a piece: the job her piece's page started, and that piece.
  job?: string;
  from?: string;
  // `from` is a wish (Style a piece on a wish).
  fromWish?: boolean;
  presentation: DraftPresentation;
}) {
  const router = useRouter();
  const onClose = () => {
    if (presentation === 'drawer' || window.history.length > 1) router.back();
    else router.push('/looks');
  };
  return (
    <DraftLook
      id={id}
      {...(pieceId ? { pieceId } : {})}
      {...(day ? { day } : {})}
      {...(images ? { images } : {})}
      {...(pick ? { pick } : {})}
      {...(job ? { job } : {})}
      {...(from ? { from } : {})}
      {...(fromWish ? { fromWish } : {})}
      presentation={presentation}
      onClose={onClose}
    />
  );
}
