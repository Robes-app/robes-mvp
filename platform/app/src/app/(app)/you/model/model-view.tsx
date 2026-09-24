'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Model, UpdateModelInput } from '@robes/contracts';
import { you } from '@robes/copy';
import { Button, Eyebrow, SegmentedControl, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { errorCopy } from '@/lib/error-copy';

const copy = you.model;

// Swatch colours are catalog data (like the style swatches), the one place colour comes inline.
function SwatchRow({
  label,
  hexes,
  names,
  value,
  onPick,
}: {
  label: string;
  hexes: string[];
  names: readonly string[];
  value: number;
  onPick: (i: number) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-sans text-sm text-ink-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {hexes.map((hex, i) => (
          <button
            key={hex}
            type="button"
            aria-label={names[i] ?? hex}
            aria-pressed={i === value}
            onClick={() => onPick(i)}
            className="size-11 rounded-full border border-hairline outline-offset-2 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function ModelView() {
  const queryClient = useQueryClient();
  const toast = useToast();
  // Polls only while her portrait is being drawn.
  const query = useApi('me.model.get', undefined, {
    refetchInterval: (q) => (q.state.data?.cell.status === 'pending' ? 3_000 : false),
  });
  const update = useApiMutation('me.model.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.model.get'), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
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
  const model = query.data;
  if (!model) return <Skeleton className="aspect-[4/5] w-full max-w-sm" />;
  const pick = (input: UpdateModelInput) => update.mutate({ input });

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ModelStage model={model} />
      <div className="flex flex-col gap-6">
        <Text tone="muted">{model.filed ? copy.subtitle : copy.empty}</Text>
        {!model.filed ? (
          <Button
            variant="primary"
            className="self-start"
            loading={update.isPending}
            onClick={() => pick({})}
          >
            {copy.build}
          </Button>
        ) : null}
        <SegmentedControl
          label={copy.presence}
          value={model.presence}
          options={(['woman', 'man', 'unspecified'] as const).map((value) => ({
            value,
            label: copy.presenceOptions[value],
          }))}
          onChange={(presence) => pick({ presence })}
        />
        <SwatchRow
          label={copy.skin}
          hexes={model.swatches.skin}
          names={copy.skinNames}
          value={model.skin}
          onPick={(skin) => pick({ skin })}
        />
        <SwatchRow
          label={copy.hair}
          hexes={model.swatches.hair}
          names={copy.hairNames}
          value={model.hair}
          onPick={(hair) => pick({ hair })}
        />
        <SegmentedControl
          label={copy.line}
          value={model.line ?? 'none'}
          options={(['soft', 'none', 'straight'] as const).map((value) => ({
            value,
            label: copy.lineOptions[value],
          }))}
          onChange={(line) => pick({ line: line === 'none' ? null : line })}
        />
        <SegmentedControl
          label={copy.frame}
          value={model.frame ?? 'none'}
          options={(['fuller', 'none', 'narrower'] as const).map((value) => ({
            value,
            label: copy.frameOptions[value],
          }))}
          onChange={(frame) => pick({ frame: frame === 'none' ? null : frame })}
        />
        {!model.reads.colour || !model.reads.silhouette ? (
          <Link href="/you/style" className="self-start underline underline-offset-4">
            {copy.photos}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ModelStage({ model }: { model: Model }) {
  return (
    <figure className="flex flex-col gap-2">
      <Eyebrow>{copy.source[model.source]}</Eyebrow>
      {model.cell.imageUrl ? (
        // Catalog portrait signed per viewer; a single fixed-ratio image, no renditions.
        // biome-ignore lint/performance/noImgElement: signed catalog URL, fixed 4:5 frame
        <img
          src={model.cell.imageUrl}
          alt={copy.imageAlt}
          className="aspect-[4/5] w-full rounded-crisp object-cover"
        />
      ) : (
        <Skeleton className="aspect-[4/5] w-full" />
      )}
      {model.cell.status === 'pending' ? (
        <Text role="status" size="small" tone="muted">
          {copy.creating}
        </Text>
      ) : model.cell.status === 'failed' ? (
        <Text role="status" size="small" tone="muted">
          {copy.failed}
        </Text>
      ) : null}
    </figure>
  );
}
