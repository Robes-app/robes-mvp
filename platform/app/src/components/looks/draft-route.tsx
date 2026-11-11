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
  presentation,
}: {
  id: string;
  pieceId?: string;
  day?: string;
  images?: 'add';
  pick?: boolean;
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
      presentation={presentation}
      onClose={onClose}
    />
  );
}
