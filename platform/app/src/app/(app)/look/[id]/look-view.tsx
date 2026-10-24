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
import { noteShort } from '@robes/core/looks';
import { Button, ErrorText, Eyebrow, Field, Heading, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { DiarySheet } from '@/components/looks/diary-sheet';
import { LookImage } from '@/components/looks/look-image';
import { LookPicture, SavedRack, savedMeta, WorkingLook } from '@/components/looks/look-page';
import { WearRecord } from '@/components/looks/wear-record';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { useLookEditor } from '@/lib/look-editor';
import { withoutId } from '@/lib/wardrobe';
import { SeeOnMe } from './see-on-me';
import { ShareLook } from './share-look';

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
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  if (!query.data) return <LookSkeleton />;
  return (
    <>
      {/* One look, three states (docs/look-states-brief.md): suggested and draft are hers to work on. */}
      {query.data.status !== 'saved' ? (
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
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key });
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
  const [day, setDay] = useState('');

  const onPin = (e: FormEvent) => {
    e.preventDefault();
    if (!day) return;
    actions.pin.mutate({ params: { id: look.id }, input: { dates: [day], slot: 'day' } });
  };

  return (
    <article className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {look.frame ? (
        <LookPicture look={look} />
      ) : (
        <LookImage look={look} priority sizes="(min-width: 768px) 40vw, 100vw" />
      )}
      <div className="flex flex-col gap-6">
        <LookName look={look} update={actions.update} editing={editor.editing} />
        <Text size="small" tone="muted">
          {savedMeta(look, editor.rack.rows.length)}
        </Text>
        {look.note ? (
          <section aria-labelledby="look-note" className="flex flex-col gap-2">
            <Heading level={2} size="sm" id="look-note">
              {copy.note}
            </Heading>
            <Text>{noteShort(look.note)}</Text>
          </section>
        ) : null}
        <SavedRack look={look} editor={editor} />
        {editor.editing ? null : (
          <>
            <WearRecord look={look} />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                loading={actions.wear.isPending}
                onClick={() =>
                  actions.wear.mutate({ params: { id: look.id }, input: { wornOn: localToday() } })
                }
              >
                {copy.wearToday}
              </Button>
              <Button
                variant="secondary"
                loading={actions.variant.isPending}
                onClick={() => actions.variant.mutate({ params: { id: look.id }, input: {} })}
              >
                {copy.saveAsNew}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  actions.remove.mutate({ params: { id: look.id } });
                  router.push('/looks');
                }}
              >
                {copy.remove}
              </Button>
            </div>
            {look.frame ? null : <SeeOnMe look={look} />}
            <ShareLook lookId={look.id} />
            <form onSubmit={onPin} className="flex flex-wrap items-end gap-2">
              <Field
                type="date"
                label={copy.wearOnDay}
                value={day}
                min={localToday()}
                onChange={(e) => setDay(e.target.value)}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={!day}
                loading={actions.pin.isPending}
              >
                {copy.addToPlan}
              </Button>
            </form>
          </>
        )}
      </div>
    </article>
  );
}

function LookName({
  look,
  update,
  editing: editingLook,
}: {
  look: Look;
  update: ReturnType<typeof useLookActions>['update'];
  editing: boolean;
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
      <Heading level={1} size="xl">
        {look.name}
      </Heading>
      {look.nameProvisional ? (
        <Text size="small" tone="muted">
          {copy.suggested}
        </Text>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {look.nameProvisional ? (
          <Button variant="quiet" loading={update.isPending} onClick={() => save(look.name)}>
            {copy.keepName}
          </Button>
        ) : null}
        <Button variant="quiet" onClick={() => setEditing(true)}>
          {copy.rename}
        </Button>
      </div>
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
