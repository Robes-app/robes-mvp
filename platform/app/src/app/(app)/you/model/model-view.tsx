'use client';

import { useApi } from '@robes/api-client/react';
import type { Model } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { ErrorText, Skeleton, Text } from '@robes/ui';
import Link from 'next/link';
import { errorCopy } from '@/lib/error-copy';
import { lineSummary, useDrawTwin, useModel } from './twin-parts';

const copy = you.model;
const tw = twin.twinPage;

const doorClass =
  'flex min-h-[76px] w-full items-center justify-between gap-4 border-b border-hairline px-4 py-3.5 last:border-b-0 hover:bg-surface-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

function Door({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className={doorClass}>
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-xl text-ink">{label}</span>
        <span className="font-sans text-sm text-ink-muted">{sub}</span>
      </span>
      <Icon name="forward" size={16} />
    </Link>
  );
}

// You › Your digital twin (legacy 2026-10-20 redline 3a): her model as the hero, then two doors —
// Colouring (one close-up) and Body shape (her line, by hand). No full-length photograph.
export function ModelView() {
  const query = useModel();
  const style = useApi('me.style.get');
  const dna = useApi('me.dna.get');
  useDrawTwin('mount');

  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const model = query.data;
  if (!model || !style.data || !dna.data) {
    return <Skeleton className="h-[440px] w-full md:h-[480px] md:rounded-soft" />;
  }
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  return (
    <div className="flex flex-col gap-8">
      <ModelStage model={model} />
      <nav aria-label={tw.title} className="rounded-soft border border-hairline bg-surface">
        <Door
          href="/you/model/colouring"
          label={tw.colouring}
          sub={
            colour
              ? [colour.season, colour.undertone, colour.contrast].filter(Boolean).join(' · ')
              : tw.colouringSub
          }
        />
        <Door href="/you/model/body" label={tw.bodyShape} sub={line || tw.bodyShapeSub} />
      </nav>
    </div>
  );
}

// The hero (legacy .tw-stage): 440 tall and flush under the header, full-bleed, on the phone; a
// bordered 480 card on the web. A 90px fade to the ground at its foot carries the caption, which
// sits inside the stage — her colour words, never a shape.
function ModelStage({ model }: { model: Model }) {
  const image = model.twin.imageUrl ?? model.cell.imageUrl;
  const drawing = model.twin.status === 'pending' || model.cell.status === 'pending';
  const failed =
    model.twin.status === 'failed' || (!model.twin.imageUrl && model.cell.status === 'failed');
  return (
    <div className="flex flex-col gap-2">
      <figure className="-mx-4 -mt-6 relative h-[440px] overflow-hidden bg-surface-sunk md:mx-0 md:mt-0 md:h-[480px] md:rounded-soft md:border md:border-hairline">
        {image ? (
          // Signed per viewer; one fixed frame, no renditions.
          // biome-ignore lint/performance/noImgElement: signed URL, fixed hero frame
          <img
            src={image}
            alt={copy.imageAlt}
            className={`absolute inset-0 size-full object-cover object-[50%_12%] ${drawing && !model.twin.current ? 'opacity-60' : ''}`}
          />
        ) : (
          <Skeleton className="absolute inset-0 size-full rounded-none" />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-t from-bg to-transparent"
        />
        <figcaption className="absolute inset-x-5 bottom-[18px] font-display text-ink text-xl italic leading-[1.35]">
          {tw.caption(copy.skinNames[model.skin] ?? '', copy.hairNames[model.hair] ?? '')}
        </figcaption>
      </figure>
      {drawing ? (
        <Text role="status" size="small" tone="muted">
          {tw.drawing}
        </Text>
      ) : failed ? (
        <Text role="status" size="small" tone="muted">
          {tw.twinFailed}
        </Text>
      ) : null}
    </div>
  );
}
