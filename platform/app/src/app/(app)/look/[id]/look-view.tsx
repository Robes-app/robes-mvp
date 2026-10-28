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
import { isHandBuiltDraft } from '@robes/core/looks';
import {
  ErrorText,
  Heading,
  IconButton,
  InlineTitleField,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Composer } from '@/components/looks/composer';
import { DiarySheet } from '@/components/looks/diary-sheet';
import { LookHero } from '@/components/looks/look-hero';
import { SavedRack, savedMeta, WorkingLook } from '@/components/looks/look-page';
import { WearRecord } from '@/components/looks/wear-record';
import { usePushedView } from '@/components/shell/app-shell';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { useLookEditor } from '@/lib/look-editor';
import { withoutId } from '@/lib/wardrobe';

const copy = looks.page;

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
  // A look is a pushed view on a phone: the back pill alone, no masthead and no dock (redline).
  usePushedView();
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  if (!query.data) return <LookSkeleton />;
  return (
    <>
      {/* One look, three states (docs/look-states-brief.md): suggested and draft are hers to work on. */}
      {isHandBuiltDraft(query.data) ? (
        // A draft she builds by hand stays in the composer until she saves it.
        <Composer look={query.data} onSaved={setJustSaved} />
      ) : query.data.status !== 'saved' ? (
        <WorkingLook look={query.data} onSaved={setJustSaved} />
      ) : (
        <LookBody look={query.data} />
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

function LookBody({ look }: { look: Look }) {
  const router = useRouter();
  const actions = useLookActions(look);
  const editor = useLookEditor(look);
  const [diary, setDiary] = useState(false);

  return (
    // The foot clears the look's fixed bar (Edit look, or Done · Update).
    <article className="grid gap-8 pb-40 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <LookHero
        look={look}
        eyebrow={editor.editing ? lookbook.eyebrow.editing : lookbook.eyebrow.saved}
        onDiary={() => setDiary(true)}
      />
      <div className="flex flex-col gap-6">
        <LookName
          look={look}
          update={actions.update}
          meta={savedMeta(look, editor.rack.rows.length, localToday())}
        />
        <SavedRack look={look} editor={editor} />
        {editor.editing ? null : (
          <>
            <WearRecord look={look} onAddDate={() => setDiary(true)} />
            {/* Beta's foot: the record, then Delete this look. Wearing is the diary on the
                picture, a new look the composer, her model You · Model (27 Oct). */}
            <button
              type="button"
              onClick={() => {
                actions.remove.mutate({ params: { id: look.id } });
                router.push('/looks');
              }}
              className="min-h-11 self-start font-sans text-danger text-sm underline underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              {copy.remove}
            </button>
          </>
        )}
      </div>
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
