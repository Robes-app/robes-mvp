'use client';

import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { ErrorText, Skeleton } from '@robes/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DiarySheet } from '@/components/looks/diary-sheet';
import { DraftLook } from '@/components/looks/draft-look';
import { WorkingLook } from '@/components/looks/look-page';
import { usePushedView } from '@/components/shell/app-shell';
import { errorCopy } from '@/lib/error-copy';

export function LookView({ id }: { id: string }) {
  // Follows a render on her model until it lands.
  const query = useApi(
    'looks.get',
    { params: { id } },
    {
      refetchInterval: (q) =>
        q.state.data?.onModel === 'pending' || q.state.data?.framePending ? 3_000 : false,
    },
  );
  // Save opens the diary every time; the sheet outlives the working page it was saved from.
  const [justSaved, setJustSaved] = useState<Look | null>(null);
  const search = useSearchParams();
  // `?schedule=1`: a draft just saved from its drawer opens with the diary up.
  const schedule = search.get('schedule') === '1';
  const router = useRouter();
  // A look is a pushed view on a phone: the back pill alone, no masthead and no dock (redline).
  usePushedView();
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  if (!query.data) return <LookSkeleton />;
  return (
    <>
      {/* One look, three states (docs/look-states-brief.md): suggested and draft are hers to work on. */}
      {query.data.status === 'draft' ? (
        // Every draft is the one DraftLook (D14): on its own page here, a drawer from the app's
        // screens (/looks/draft/:id).
        <DraftLook
          id={query.data.id}
          {...(search.get('day') ? { day: search.get('day') ?? undefined } : {})}
          presentation="page"
          onClose={() => router.push(search.get('day') ? `/?day=${search.get('day')}` : '/looks')}
        />
      ) : query.data.status !== 'saved' ? (
        <WorkingLook look={query.data} onSaved={setJustSaved} />
      ) : (
        // A saved look edits in place (Felix 3e, D17): the same DraftLook as Home's Edit look
        // drawer, on its own page.
        <DraftLook
          id={query.data.id}
          presentation="saved"
          schedule={schedule}
          onClose={() => router.back()}
        />
      )}
      <DiarySheet look={justSaved} onClose={() => setJustSaved(null)} />
    </>
  );
}

function LookSkeleton() {
  return (
    <div aria-busy className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Skeleton className="aspect-[4/5]" />
      <div className="flex flex-col gap-4">
        <Skeleton shape="text" className="h-10 w-2/3" />
        <Skeleton shape="text" />
        <Skeleton shape="text" className="w-1/2" />
      </div>
    </div>
  );
}
