'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { type Look, rackFromLook } from '@robes/contracts';
import { lookbook, looks } from '@robes/copy';
import {
  Button,
  ErrorText,
  Heading,
  IconButton,
  InlineTitleField,
  Skeleton,
  Tabs,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DiarySheet } from '@/components/looks/diary-sheet';
import { DraftLook } from '@/components/looks/draft-look';
import { ImageManager } from '@/components/looks/image-manager';
import { LookDetails } from '@/components/looks/look-details';
import { savedMeta, WorkingLook } from '@/components/looks/look-page';
import { PieceList } from '@/components/looks/piece-list';
import { RackRowCard } from '@/components/looks/rack-row';
import { SavedLookPhoto } from '@/components/looks/saved-look';
import { SeasonsView } from '@/components/looks/seasons-view';
import { TagsView } from '@/components/looks/tags-view';
import { WornView } from '@/components/looks/worn-view';
import { usePushedView } from '@/components/shell/app-shell';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

const copy = looks.page;
const saved = lookbook.savedLook;
const TABS = [saved.tabs.pieces, saved.tabs.details] as const;
type Tab = (typeof TABS)[number];

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
  // `?edit=1`: opened from home's Edit disc (Felix 3k), so a saved look opens its edit drawer.
  const edit = search.get('edit') === '1';
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
        <LookBody look={query.data} edit={edit} schedule={schedule} />
      )}
      <DiarySheet look={justSaved} onClose={() => setJustSaved(null)} />
    </>
  );
}

function useLookActions(look: Look) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const update = useApiMutation('looks.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  return { update };
}

// The saved look as Felix 3e (D8, D9, D10): the photo with its discs, the name, Pieces · Details,
// and one Schedule look at the foot. Edit look, the adjust disc and `?edit=1` from Home open the
// draft drawer in edit mode (D14), where the rack is worked and Delete lives (D9). `?schedule=1`
// (a draft just saved) opens the diary as the look opens. Native twin:
// mobile/src/features/looks/LookDetail.tsx SavedLook.
function LookBody({ look, edit, schedule }: { look: Look; edit: boolean; schedule: boolean }) {
  const router = useRouter();
  const actions = useLookActions(look);
  const draft = (sheet?: 'adjust') =>
    router.push(`/looks/draft/${look.id}${sheet ? `?sheet=${sheet}` : ''}`);
  const opened = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the look's first open
  useEffect(() => {
    if (edit && !opened.current) {
      opened.current = true;
      draft();
    }
  }, [edit]);
  const [diary, setDiary] = useState(schedule);
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [managing, setManaging] = useState(false);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const rows = rackFromLook(look).rows;
  return (
    // The foot clears the look's fixed bar (Schedule look).
    <article className="flex flex-col gap-4 pb-40 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
      {managing ? (
        <ImageManager look={look} onDone={() => setManaging(false)} />
      ) : (
        <SavedLookPhoto
          look={look}
          onAdjust={() => draft('adjust')}
          onImages={() => setManaging(true)}
        />
      )}
      <div className="flex flex-col gap-3">
        <LookName
          look={look}
          update={actions.update}
          meta={savedMeta(look, rows.length, localToday())}
        />
        <Tabs items={TABS} value={tab} onChange={setTab} label={saved.tabs.pieces} />
        {tab === TABS[0] ? (
          <div className="flex flex-col gap-4" data-testid="pieces-tab">
            <div className="flex justify-end">
              <Button variant="chip" onClick={() => draft()} data-testid="edit-look">
                {look.pieces.length || look.proposals.length ? saved.edit : lookbook.bar.addPieces}
              </Button>
            </div>
            <PieceList
              label={lookbook.rack.title(rows.length)}
              empty={
                rows.length === 0 ? (
                  <Text tone="muted" className="pt-3">
                    {lookbook.rack.empty}
                  </Text>
                ) : null
              }
            >
              {rows.map((row) => (
                <RackRowCard
                  key={row.key}
                  row={row}
                  image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
                  styled={look.styling[row.key]}
                  {...(row.pieceId ? { wears: piecesById.get(row.pieceId)?.wearCount ?? 0 } : {})}
                />
              ))}
            </PieceList>
          </div>
        ) : (
          <LookDetails
            look={look}
            onTags={() => setSubview('tags')}
            onSeasons={() => setSubview('seasons')}
            onWorn={() => setSubview('worn')}
            onCaption={(note) =>
              actions.update.mutate({ params: { id: look.id }, input: { note } })
            }
          />
        )}
      </div>
      {/* The look's one bar, held at the foot: Schedule look. Fixed above the tab bar on a phone,
          at the foot of the window on the web. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-hairline border-t-[0.5px] bg-bg pb-[max(1.375rem,env(safe-area-inset-bottom))]"
        data-testid="look-bar"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3 px-5 pt-3">
          <Button variant="primary" block onClick={() => setDiary(true)}>
            {saved.schedule}
          </Button>
        </div>
      </div>
      <TagsView look={look} open={subview === 'tags'} onBack={() => setSubview(null)} />
      <SeasonsView look={look} open={subview === 'seasons'} onBack={() => setSubview(null)} />
      <WornView
        look={look}
        open={subview === 'worn'}
        onBack={() => setSubview(null)}
        onAddDate={() => {
          setSubview(null);
          setDiary(true);
        }}
      />
      <DiarySheet look={diary ? look : null} onClose={() => setDiary(false)} />
    </article>
  );
}

function LookName({
  look,
  update,
  meta,
}: {
  look: Look;
  update: ReturnType<typeof useLookActions>['update'];
  meta: string;
}) {
  const [editing, setEditing] = useState(false);
  // Her name in place of the title; empty or unchanged keeps the name it had (a look is named).
  // The page shows the saved name once the update lands; errors surface as a toast.
  const save = (next: string) => {
    setEditing(false);
    if (next !== look.name) update.mutate({ params: { id: look.id }, input: { name: next } });
  };
  // The eyebrow is over the picture; no "Robes’ suggestion · Keep this name" — the pencil is how
  // she renames (27 Oct). The name and its one line of facts sit close together.
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        {editing ? (
          <InlineTitleField
            value={look.name}
            label={looks.look.nameLabel}
            size="xl"
            required
            onCommit={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <Heading level={1} size="xl" className="min-w-0 flex-1">
              {look.name}
            </Heading>
            <IconButton icon="pencil" label={copy.rename} onClick={() => setEditing(true)} />
          </>
        )}
      </div>
      <Text size="small" tone="muted">
        {meta}
      </Text>
    </header>
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
