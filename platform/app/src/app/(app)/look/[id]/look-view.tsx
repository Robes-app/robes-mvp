'use client';

import { useApi } from '@robes/api-client/react';
import { pictureLanding } from '@robes/core/looks';
import { ErrorText, Skeleton } from '@robes/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { DraftLook } from '@/components/looks/draft-look';
import { usePushedView } from '@/components/shell/app-shell';
import { errorCopy } from '@/lib/error-copy';

export function LookView({ id }: { id: string }) {
  // Follows a render on her model until it lands.
  const query = useApi(
    'looks.get',
    { params: { id } },
    {
      // Until the picture has landed, renditions and all (pictureLanding).
      refetchInterval: (q) => (pictureLanding(q.state.data) ? 3_000 : false),
    },
  );
  const search = useSearchParams();
  // `?schedule=1`: the look opens with the diary up.
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
      {/* One look, three states (docs/look-states-brief.md). */}
      {query.data.status === 'draft' ? (
        // Every draft is the one DraftLook (D14): on its own page here, a drawer from the app's
        // screens (/looks/draft/:id).
        <DraftLook
          id={query.data.id}
          {...(search.get('day') ? { day: search.get('day') ?? undefined } : {})}
          presentation="page"
          onClose={() => router.push(search.get('day') ? `/?day=${search.get('day')}` : '/looks')}
        />
      ) : (
        // A saved look edits in place (Felix 3e, D17): the same DraftLook as Home's Edit look
        // drawer, on its own page. A suggestion is the same page (design "Suggested looks", 23
        // Nov): Suggested by Robes on its photograph and Save look its one button.
        <DraftLook
          id={query.data.id}
          presentation="saved"
          schedule={schedule && query.data.status === 'saved'}
          onClose={() => router.back()}
        />
      )}
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
