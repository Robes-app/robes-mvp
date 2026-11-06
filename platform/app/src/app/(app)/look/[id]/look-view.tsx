'use client';

import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook, looks, wardrobe } from '@robes/copy';
import {
  AlertDialog,
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
import { AdjustDock } from '@/components/looks/adjust-dock';
import { DiarySheet } from '@/components/looks/diary-sheet';
import { DraftPage } from '@/components/looks/draft-page';
import { ImageManager } from '@/components/looks/image-manager';
import { LookDetails } from '@/components/looks/look-details';
import { savedMeta, WorkingLook } from '@/components/looks/look-page';
import { PieceList } from '@/components/looks/piece-list';
import { RackRowCard } from '@/components/looks/rack-row';
import { SavedLookPhoto } from '@/components/looks/saved-look';
import { SeasonsView } from '@/components/looks/seasons-view';
import { SwapSheet } from '@/components/looks/swap-sheet';
import { TagsView } from '@/components/looks/tags-view';
import { WornView } from '@/components/looks/worn-view';
import { usePushedView } from '@/components/shell/app-shell';
import { type Adjust, useAdjust } from '@/lib/adjust';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { useLookEditor } from '@/lib/look-editor';
import { withoutId } from '@/lib/wardrobe';

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
  // `?edit=1`: opened from home's Edit disc (Felix 3k), so a saved look opens in Editing.
  const edit = useSearchParams().get('edit') === '1';
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
        // Every draft — from the prompt box or built by hand — is the one draft page (plan 2026-11-03).
        <DraftPage look={query.data} onSaved={setJustSaved} />
      ) : query.data.status !== 'saved' ? (
        <WorkingLook look={query.data} onSaved={setJustSaved} />
      ) : (
        <LookBody look={query.data} edit={edit} />
      )}
      <DiarySheet look={justSaved} onClose={() => setJustSaved(null)} />
    </>
  );
}

function useLookActions(look: Look) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const onError = (err: unknown) => toast({ message: errorCopy(err) });
  const key = queryKeys.call('looks.get', { params: { id: look.id } });

  const update = useApiMutation('looks.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError,
  });
  const remove = useUndoableMutation('looks.delete', {
    optimistic: (args) => [
      { queryKey: queryKeys.route('looks.list'), update: withoutId(args.params.id) },
    ],
    onError,
    undo: {
      onAvailable: (handle) =>
        toast({
          message: copy.removed,
          action: { label: wardrobe.undo, onAction: () => void handle.undo() },
        }),
      compensate: (args) => client.call('looks.restore', { params: { id: args.params.id } }),
    },
  });
  return { update, remove };
}

// The saved look as Felix 3e (D8, D9, D10): the photo with its discs, the name, Pieces · Details,
// and one Schedule look at the foot. Editing (Edit look, or `?edit=1` from Home) turns the piece
// list into its edit mode with Done · Update look at the foot and Delete as a reveal (D9).
// Native twin: mobile/src/features/looks/LookDetail.tsx SavedLook.
function LookBody({ look, edit }: { look: Look; edit: boolean }) {
  const router = useRouter();
  const actions = useLookActions(look);
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const opened = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the look's first open
  useEffect(() => {
    if (edit && !opened.current) {
      opened.current = true;
      editor.startEditing();
    }
  }, [edit]);
  const adjust = useAdjust(look, editor, 'saved');
  adjustRef.current = adjust;
  const [diary, setDiary] = useState(false);
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [managing, setManaging] = useState(false);
  const [subview, setSubview] = useState<'tags' | 'seasons' | 'worn' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const dock = useRef<HTMLDivElement>(null);
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const swapRow = editor.rack.rows.find((r) => r.key === swapping) ?? null;
  const remove = () => {
    setConfirmDelete(false);
    actions.remove.mutate({ params: { id: look.id } });
    router.push('/looks');
  };
  return (
    // The foot clears the look's fixed bar (Schedule look, or Done · Update look).
    <article className="flex flex-col gap-4 pb-40 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
      {managing ? (
        <ImageManager look={look} onDone={() => setManaging(false)} />
      ) : (
        <SavedLookPhoto
          look={look}
          onAdjust={() => {
            dock.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            dock.current?.querySelector<HTMLElement>('textarea, input, button')?.focus();
          }}
          onImages={() => setManaging(true)}
        />
      )}
      <div className="flex flex-col gap-3">
        <LookName
          look={look}
          update={actions.update}
          meta={savedMeta(look, editor.rack.rows.length, localToday())}
        />
        <Tabs items={TABS} value={tab} onChange={setTab} label={saved.tabs.pieces} />
        {tab === TABS[0] ? (
          <div className="flex flex-col gap-4" data-testid="pieces-tab">
            {editor.editing ? null : (
              <div className="flex justify-end">
                <Button variant="chip" onClick={editor.startEditing}>
                  {look.pieces.length || look.proposals.length
                    ? saved.edit
                    : lookbook.bar.addPieces}
                </Button>
              </div>
            )}
            <PieceList
              label={lookbook.rack.title(editor.rack.rows.length)}
              {...(editor.editing ? { onAdd: () => setAdding(true) } : {})}
              empty={
                editor.rack.rows.length === 0 && !editor.editing ? (
                  <Text tone="muted" className="pt-3">
                    {lookbook.rack.empty}
                  </Text>
                ) : null
              }
            >
              {editor.rack.rows.map((row) => (
                <RackRowCard
                  key={row.key}
                  row={row}
                  image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
                  mark={editor.mark(row.key)}
                  styled={editor.rack.styling[row.key]}
                  {...(!editor.editing && row.pieceId
                    ? { wears: piecesById.get(row.pieceId)?.wearCount ?? 0 }
                    : {})}
                  {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
                  {...(editor.editing
                    ? { onSwap: () => setSwapping(row.key), onRemove: () => editor.remove(row.key) }
                    : {})}
                />
              ))}
            </PieceList>
            {editor.rack.rows.length > 0 ? (
              <div ref={dock}>
                <AdjustDock adjust={adjust} name={look.name} />
              </div>
            ) : null}
            {editor.editing ? (
              // Delete lives in Editing (D9): a destructive reveal, asked before it runs.
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-11 self-start font-sans text-danger text-sm underline underline-offset-4 hover:opacity-80 focus-visible:outline-[1.5px] focus-visible:outline-focus-ring"
              >
                {copy.remove}
              </button>
            ) : null}
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
      {/* The look's one bar, held at the foot: Schedule look, or Done · Update look while she
          works. Fixed above the tab bar on a phone, at the foot of the window on the web. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-hairline border-t-[0.5px] bg-bg pb-[max(1.375rem,env(safe-area-inset-bottom))]"
        data-testid="look-bar"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3 px-5 pt-3">
          {editor.editing ? (
            <>
              <Button variant="quiet" onClick={editor.discard}>
                {editor.dirty ? lookbook.bar.discard : lookbook.bar.done}
              </Button>
              <Button
                variant="primary"
                disabled={!editor.dirty && !adjust.stale}
                loading={editor.saving}
                onClick={() =>
                  void editor.update().then((ok) => {
                    if (ok) adjust.drawForSave();
                  })
                }
              >
                {adjust.stale ? `↻ ${lookbook.bar.update}` : lookbook.bar.update}
              </Button>
            </>
          ) : (
            <Button variant="primary" block onClick={() => setDiary(true)}>
              {saved.schedule}
            </Button>
          )}
        </div>
      </div>
      <SwapSheet
        open={swapping !== null || adding}
        swapping={swapRow ? { name: swapRow.name, category: swapRow.category } : null}
        onRack={editor.rack.rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
        onClose={() => {
          setSwapping(null);
          setAdding(false);
        }}
        // One tap swaps while she edits, behind an Undo.
        instant
        onPick={(piece) => (swapping ? editor.swap(swapping, piece) : editor.add(piece))}
      />
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
      <AlertDialog
        open={confirmDelete}
        title={saved.deleteTitle}
        message={saved.deleteBody}
        actions={[
          { label: saved.delete, variant: 'primary', onClick: remove },
          { label: saved.keep, variant: 'outline', onClick: () => setConfirmDelete(false) },
        ]}
        onDismiss={() => setConfirmDelete(false)}
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
