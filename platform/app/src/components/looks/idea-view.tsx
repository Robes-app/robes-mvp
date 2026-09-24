'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Idea } from '@robes/contracts';
import { looks } from '@robes/copy';
import { Button, Eyebrow, Heading, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { errorCopy } from '@/lib/error-copy';
import { ideaNeedsRefresh } from '@/lib/looks';
import { IdeaFrame } from './idea-frame';

const copy = looks.result;
const REFRESH_MS = 1500;

export function IdeaView({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useApi(
    'looks.ideas.get',
    { params: { id: ideaId } },
    { refetchInterval: (q) => (ideaNeedsRefresh(q.state.data) ? REFRESH_MS : false) },
  );
  const refreshLists = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.ideas.list') });
  const save = useApiMutation('looks.ideas.save', {
    onSuccess: (idea) => {
      queryClient.setQueryData(queryKeys.call('looks.ideas.get', { params: { id: ideaId } }), idea);
      void refreshLists();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const remove = useApiMutation('looks.ideas.delete', {
    onSuccess: () => {
      void refreshLists();
      toast({ message: copy.removed });
      router.push('/looks/ideas');
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });

  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  const idea = query.data;
  if (!idea) return <IdeaSkeleton />;
  return (
    <IdeaBody
      idea={idea}
      onSave={() => save.mutate({ params: { id: idea.id } })}
      onRemove={() => remove.mutate({ params: { id: idea.id } })}
      saving={save.isPending}
      removing={remove.isPending}
    />
  );
}

function IdeaBody({
  idea,
  onSave,
  onRemove,
  saving,
  removing,
}: {
  idea: Idea;
  onSave: () => void;
  onRemove: () => void;
  saving: boolean;
  removing: boolean;
}) {
  const saved = idea.savedAt !== null;
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <Heading level={1} size="xl">
            {idea.title}
          </Heading>
          {idea.fallback ? <Text tone="muted">{copy.fallback}</Text> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={onRemove} loading={removing}>
            {copy.remove}
          </Button>
          <Button
            variant={saved ? 'secondary' : 'primary'}
            disabled={saved}
            loading={saving}
            onClick={onSave}
          >
            {saved ? copy.saved : copy.save}
          </Button>
        </div>
      </header>
      <ol aria-label={copy.eyebrow} className="grid gap-8 md:grid-cols-3">
        {idea.ways.map((way, idx) => (
          <li key={way.title} className="flex flex-col gap-4">
            <IdeaFrame
              frame={idea.frames.find((f) => f.idx === idx)}
              alt={copy.frameAlt(way.title)}
              priority={idx === 0}
              sizes="(min-width: 768px) 33vw, 100vw"
            />
            <div className="flex flex-col gap-2">
              <Eyebrow>{way.eyebrow}</Eyebrow>
              <Heading level={2} size="md">
                {way.title}
              </Heading>
              <dl className="flex flex-col gap-2">
                <Detail term={copy.outfit} value={way.outfit} />
                <Detail term={copy.details} value={way.details} />
                <Detail term={copy.accessories} value={way.accessories} />
              </dl>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-sans text-xs font-medium text-ink-muted">{term}</dt>
      <dd className="font-sans text-sm font-light text-ink">{value}</dd>
    </div>
  );
}

export function IdeaSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-8">
      <Skeleton shape="text" className="h-10 w-2/3" />
      <div className="grid gap-8 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-4">
            <Skeleton className="aspect-[4/5]" />
            <Skeleton shape="text" className="w-1/2" />
            <Skeleton shape="text" />
          </div>
        ))}
      </div>
    </div>
  );
}
