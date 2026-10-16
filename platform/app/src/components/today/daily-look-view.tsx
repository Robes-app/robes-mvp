'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { DailyItem } from '@robes/contracts';
import { today } from '@robes/copy';
import { Button, Eyebrow, Field, Heading, Image, Skeleton, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { anchorItem, anchorPending, itemsLanding, weatherLine } from '@/lib/daily';
import { errorCopy } from '@/lib/error-copy';
import { useFrameRender } from '@/lib/frame-render';
import { imageSources } from '@/lib/image';

const copy = today.daily;

// Robes' picture of a suggested item: rendered on demand (UX-09); the anchor shows above.
function ItemFrame({ item, busy, onShow }: { item: DailyItem; busy: boolean; onShow: () => void }) {
  const src = item.image ? imageSources(item.image.renditions) : null;
  if (item.imageStatus === 'ready' && src) {
    return (
      <Image
        {...src}
        sizes="80px"
        alt={copy.itemAlt(item.name)}
        blurhash={item.image?.blurhash ?? null}
      />
    );
  }
  if (item.imageStatus === 'deferred' || item.imageStatus === 'failed') {
    return (
      <Button
        variant="quiet"
        loading={busy}
        onClick={onShow}
        aria-label={copy.showItemLabel(item.name)}
        className="aspect-[4/5] w-full rounded-crisp border border-hairline px-1 text-xs"
      >
        {copy.showItem}
      </Button>
    );
  }
  return <Skeleton data-frame="pending" className="aspect-[4/5]" />;
}

function ItemRow({
  item,
  isAnchor,
  busy,
  onShow,
}: {
  item: DailyItem;
  isAnchor: boolean;
  busy: boolean;
  onShow: () => void;
}) {
  const own = item.piece ? imageSources(item.piece.image?.renditions ?? []) : null;
  return (
    <li className="flex gap-4 border-b border-hairline py-4">
      {!item.piece && !isAnchor ? (
        <div className="w-20 shrink-0">
          <ItemFrame item={item} busy={busy} onShow={onShow} />
        </div>
      ) : null}
      {item.piece ? (
        <div className="w-20 shrink-0">
          {own ? (
            <Image
              {...own}
              sizes="80px"
              alt={item.piece.label}
              blurhash={item.piece.image?.blurhash ?? null}
            />
          ) : (
            <div aria-hidden className="aspect-[4/5] rounded-crisp bg-surface-sunk" />
          )}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <Text>
          {item.piece ? item.piece.label : item.name}
          {item.piece ? <span className="ml-2 text-sm text-ink-muted">{copy.yours}</span> : null}
        </Text>
        {!item.piece && (item.brand || item.pricePoint) ? (
          <Text size="small" tone="muted">
            {[item.brand, item.pricePoint].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {item.how ? <Text size="small">{item.how}</Text> : null}
        {!item.piece && item.alternates.length > 0 ? (
          <Text size="small" tone="muted">
            {copy.alternates}{' '}
            {item.alternates
              .slice(0, 3)
              .map((a) => [a.name, a.brand].filter(Boolean).join(', '))
              .join(' · ')}
          </Text>
        ) : null}
      </div>
    </li>
  );
}

export function DailyLookSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="aspect-[4/5] w-full max-w-sm" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// Style it for today, the result: four steps, her pieces where she owns them, saved on naming.
export function DailyLookView({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const frames = useFrameRender('today.looks.render', id, () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.call('today.looks.get', { params: { id } }),
    });
  });
  const query = useApi(
    'today.looks.get',
    { params: { id } },
    {
      refetchInterval: (q) =>
        q.state.data && (anchorPending(q.state.data) || itemsLanding(q.state.data, frames.asked))
          ? 2_000
          : false,
    },
  );
  const [name, setName] = useState<string | null>(null);
  const save = useApiMutation('today.looks.save', {
    onSuccess: (look) => router.push(`/look/${look.id}`),
  });

  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  const look = query.data;
  if (!look) return <DailyLookSkeleton />;

  const anchor = anchorItem(look);
  const frame = anchor?.image ? imageSources(anchor.image.renditions) : null;
  const weather = weatherLine(look.weather);
  const value = name ?? look.headline;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    save.mutate({ params: { id }, input: { name: value.trim() } });
  }

  return (
    <article className="flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Eyebrow>{look.occasionLabel || copy.eyebrow}</Eyebrow>
        <Heading level={1} size="xl">
          {look.headline}
        </Heading>
        {weather ? <Text tone="muted">{weather}</Text> : null}
      </header>
      <div className="w-full max-w-sm">
        {frame ? (
          <Image
            {...frame}
            sizes="(min-width: 640px) 384px, 100vw"
            alt={copy.imageAlt(look.headline)}
            blurhash={anchor?.image?.blurhash ?? null}
            priority
          />
        ) : anchor?.image?.status === 'failed' ? null : (
          <Skeleton data-frame="pending" className="aspect-[4/5]" />
        )}
      </div>
      {look.stylistSummary ? <Text>{look.stylistSummary}</Text> : null}
      {look.steps.map((step) => (
        <section key={step.title} aria-labelledby={`step-${step.title}`} className="flex flex-col">
          <Heading id={`step-${step.title}`} level={2} size="md">
            {copy.steps[step.title]}
          </Heading>
          <ul>
            {step.items.map((item) => (
              <ItemRow
                key={item.imageIndex}
                item={item}
                isAnchor={item.imageIndex === anchor?.imageIndex}
                busy={frames.renderingIdx === item.imageIndex}
                onShow={() => frames.start(item.imageIndex)}
              />
            ))}
          </ul>
        </section>
      ))}
      {look.transitionTip ? (
        <section aria-labelledby="transition" className="flex flex-col gap-2">
          <Heading id="transition" level={2} size="md">
            {copy.transition}
          </Heading>
          <Text>{look.transitionTip}</Text>
        </section>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-4 border-t border-hairline pt-6">
        <Field
          label={copy.nameLabel}
          name="name"
          maxLength={120}
          value={value}
          onChange={(e) => setName(e.target.value)}
        />
        {save.isError ? (
          <Text role="alert" size="small" tone="danger">
            {errorCopy(save.error)}
          </Text>
        ) : null}
        <Button
          variant="primary"
          type="submit"
          disabled={!value.trim()}
          loading={save.isPending || save.isSuccess}
          loadingLabel={copy.saving}
          className="self-start"
        >
          {copy.save}
        </Button>
      </form>
    </article>
  );
}
