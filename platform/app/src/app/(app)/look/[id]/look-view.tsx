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
  Button,
  ErrorText,
  Eyebrow,
  Field,
  Heading,
  IconButton,
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
import { SeeOnMe } from './see-on-me';

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
  const router = useRouter();
  const toast = useToast();
  const onError = (err: unknown) => toast({ message: errorCopy(err) });
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  // A wear (or its undo) changes the look's count AND its record of days, so both refetch.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.wears') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };

  const update = useApiMutation('looks.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError,
  });
  const wear = useApiMutation('looks.wear', {
    onSuccess: (w) => {
      refresh();
      // Wearing is a tap with a quiet undo, never a confirmation.
      toast({
        message: copy.woreToday,
        action: {
          label: wardrobe.undo,
          onAction: () =>
            void client
              .call('looks.unwear', { params: { id: look.id, date: w.wornOn } })
              .then(refresh, onError),
        },
      });
    },
    onError,
  });
  const pin = useApiMutation('plan.pin', {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      toast({
        message: copy.addedToPlan,
        action: { label: looks.openLook, onAction: () => router.push('/plan') },
      });
    },
    onError,
  });
  const variant = useApiMutation('looks.variant', {
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      toast({ message: copy.savedAsNew });
      router.push(`/look/${created.id}`);
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
  return { update, wear, pin, variant, remove };
}

function LookBody({ look }: { look: Look }) {
  const router = useRouter();
  const actions = useLookActions(look);
  const editor = useLookEditor(look);
  const [diary, setDiary] = useState(false);

  return (
    // The foot clears the look's fixed bar (Edit look, or Done · Update).
    <article className="grid gap-8 pb-40 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <LookHero look={look} onDiary={() => setDiary(true)} />
      <div className="flex flex-col gap-6">
        <LookName
          look={look}
          update={actions.update}
          editing={editor.editing}
          meta={savedMeta(look, editor.rack.rows.length)}
        />
        <SavedRack look={look} editor={editor} />
        {editor.editing ? null : (
          <>
            <WearRecord look={look} onAddDate={() => setDiary(true)} />
            {/* One ink commitment; a day is the diary's (decided 27 Oct). */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="primary"
                loading={actions.wear.isPending}
                onClick={() =>
                  actions.wear.mutate({ params: { id: look.id }, input: { wornOn: localToday() } })
                }
              >
                {copy.wearToday}
              </Button>
              <Button variant="secondary" onClick={() => setDiary(true)}>
                {copy.wearOnDay}
              </Button>
            </div>
            <Button
              variant="quiet"
              className="self-start px-0"
              loading={actions.variant.isPending}
              onClick={() => actions.variant.mutate({ params: { id: look.id }, input: {} })}
            >
              {copy.saveAsNew}
            </Button>
            {look.frame ? null : <SeeOnMe look={look} />}
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
  editing: editingLook,
  meta,
}: {
  look: Look;
  update: ReturnType<typeof useLookActions>['update'];
  editing: boolean;
  meta: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(look.name);
  // The page shows the saved name once the update lands; errors surface as a toast.
  const save = (next: string) => {
    update.mutate({ params: { id: look.id }, input: { name: next } });
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save(name.trim());
        }}
      >
        <Field
          label={copy.nameLabel}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="secondary" loading={update.isPending}>
          {copy.saveName}
        </Button>
        <Button type="button" variant="quiet" onClick={() => setEditing(false)}>
          {copy.cancel}
        </Button>
      </form>
    );
  }
  return (
    <header className="flex flex-col gap-2">
      <Eyebrow>{editingLook ? lookbook.eyebrow.editing : lookbook.eyebrow.saved}</Eyebrow>
      {/* The pencil sits on the name, as it does on a day: renaming is not its own paragraph. */}
      <div className="flex items-start gap-2">
        <Heading level={1} size="xl" className="min-w-0 flex-1">
          {look.name}
        </Heading>
        <IconButton icon="pencil" label={copy.rename} onClick={() => setEditing(true)} />
      </div>
      {/* One line straight under the title: the pieces, the wears, the last day. */}
      <Text size="small" tone="muted">
        {meta}
      </Text>
      {look.nameProvisional ? (
        <div className="flex flex-wrap items-center gap-2">
          <Text size="small" tone="muted">
            {copy.suggested}
          </Text>
          <Button variant="quiet" loading={update.isPending} onClick={() => save(look.name)}>
            {copy.keepName}
          </Button>
        </div>
      ) : null}
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
