import { useApi } from '@robes/api-client/react';
import { ui } from '@robes/copy';
import { pictureLanding } from '@robes/core/looks';
import { EmptyState, Skeleton } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { errorMessage } from '@/lib/errors';
import { DraftLook } from './DraftLook';
import { JOB_REFRESH_MS } from './ideas';

// A look in whichever state it stands (docs/look-states-brief.md §3.2), always the one DraftLook.
export function LookScreen({
  id,
  schedule = false,
}: {
  id: string;
  // `?schedule=1`: the look opens with the diary up.
  schedule?: boolean;
}) {
  const router = useRouter();
  const query = useApi(
    'looks.get',
    { params: { id } },
    {
      // Until the picture has landed, renditions and all (pictureLanding).
      refetchInterval: (q) => (pictureLanding(q.state.data) ? JOB_REFRESH_MS : false),
    },
  );
  if (query.isPending) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  if (query.isError || !query.data) {
    // Audit F5: an error is never a dead end.
    return (
      <EmptyState
        title={errorMessage(query.error)}
        action={{ label: ui.retry, onPress: () => void query.refetch() }}
      />
    );
  }
  const look = query.data;
  return look.status === 'draft' ? (
    // Every draft is the one DraftLook (D14): on its page here, a sheet from the app's screens.
    <DraftLook
      id={look.id}
      presentation="page"
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/looks'))}
    />
  ) : (
    // A saved look edits in place (Felix 3e, D17): the same DraftLook as Home's Edit look sheet,
    // on its own page. A suggestion is the same page (design "Suggested looks", 23 Nov): Suggested
    // by Robes on its photograph and Save look its one button. Web twin:
    // app/(app)/look/[id]/look-view.tsx.
    <DraftLook
      id={look.id}
      presentation="saved"
      schedule={schedule && look.status === 'saved'}
      onClose={() =>
        router.canGoBack()
          ? router.back()
          : router.replace(look.status === 'suggested' ? '/looks?tab=suggested' : '/')
      }
    />
  );
}
