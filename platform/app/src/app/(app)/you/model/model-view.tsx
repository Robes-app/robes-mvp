'use client';

import { useApi } from '@robes/api-client/react';
import type { Facts, Model } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { readAdj } from '@robes/core/avatar';
import { ErrorText, Skeleton, Text } from '@robes/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/settings-chrome';
import { errorCopy } from '@/lib/error-copy';
import { Figure, lineSummary, type TwinRead, twinRead, useDrawTwin, useModel } from './twin-parts';

const copy = you.model;
const tw = twin.twinPage;

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
  const read = twinRead(model, dna.data.facts);
  return (
    // ≥1024 the stage holds the left column (430) beside the doors; below it leads, full-bleed.
    <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-[430px_minmax(0,1fr)] lg:items-start lg:gap-12">
      <ModelStage model={model} facts={dna.data.facts} read={read} />
      <div className="flex min-w-0 flex-col gap-[22px]">
        <SettingsGroup id="twin-read" title={tw.readFrom}>
          <SettingsRow
            href="/you/model/colouring"
            label={tw.colouring}
            sub={
              colour
                ? [colour.undertone, colour.contrast].filter(Boolean).join(' · ')
                : tw.colouringSub
            }
            value={colour?.season ?? ''}
          />
          <SettingsRow href="/you/model/body" label={tw.bodyShape} sub={line || tw.bodyShapeSub} />
        </SettingsGroup>
        {/* Her model's own line: what Robes drew her from. One size up — the sans never goes italic. */}
        <p className="font-display text-ink-faint text-lg italic leading-normal max-lg:text-center">
          {tw.status(model.presence, read)}
        </p>
      </div>
    </div>
  );
}

// The hero (legacy .tw-stage): 440 tall and flush under the header, full-bleed, on the phone; a
// bordered 480 card on the web. A 90px fade to the ground at its foot carries the caption, which
// sits inside the stage — her colour words, never a shape.
function ModelStage({ model, facts, read }: { model: Model; facts: Facts; read: TwinRead }) {
  const empty = read === 'none';
  const image = model.twin.imageUrl ?? model.cell.imageUrl;
  const drawing = model.twin.status === 'pending' || model.cell.status === 'pending';
  const failed =
    model.twin.status === 'failed' || (!model.twin.imageUrl && model.cell.status === 'failed');
  return (
    <div className="flex flex-col gap-2 lg:sticky lg:top-[68px]">
      <figure className="-mx-6 -mt-6 relative h-[440px] overflow-hidden bg-surface-sunk md:mx-0 md:mt-0 md:h-[480px] md:rounded-soft md:border md:border-hairline lg:h-[520px]">
        {/* Her shape under the photograph: the ghost until anything is on file. */}
        <div className={`absolute inset-0 ${empty ? 'opacity-[0.22]' : ''}`}>
          <Figure
            facts={facts}
            adj={readAdj(model.adj)}
            tone={{
              skin: model.swatches.skin[model.skin] ?? '',
              hair: model.swatches.hair[model.hair] ?? '',
            }}
          />
        </div>
        {image ? (
          // Signed per viewer; one fixed frame, no renditions.
          // biome-ignore lint/performance/noImgElement: signed URL, fixed hero frame
          <img
            src={image}
            alt={copy.imageAlt}
            className={`absolute inset-0 size-full object-cover object-[50%_12%] ${drawing && !model.twin.current ? 'opacity-60' : ''}`}
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-t from-bg to-transparent"
        />
        {empty ? (
          // Nothing on file: the invitation sits in the stage, over the ghost figure.
          <p className="absolute inset-0 flex items-center justify-center px-[34px] text-center font-display text-ink-faint text-lg italic leading-[1.6]">
            {tw.stageEmpty}
          </p>
        ) : (
          <figcaption className="absolute inset-x-5 bottom-[18px] font-display text-ink text-xl italic leading-[1.35]">
            {tw.caption(copy.skinNames[model.skin] ?? '', copy.hairNames[model.hair] ?? '')}
          </figcaption>
        )}
        {drawing ? (
          // The chip on the stage while she is drawn (legacy .mv-photo-busy).
          <p
            role="status"
            className="absolute top-4 right-3.5 rounded-pill border border-hairline bg-bg/90 px-3.5 py-2 font-sans text-[9.5px] text-ink uppercase tracking-[0.16em] motion-safe:animate-pulse"
          >
            {tw.drawing}
          </p>
        ) : null}
      </figure>
      {failed && !drawing ? (
        <Text role="status" size="small" tone="muted">
          {tw.twinFailed}
        </Text>
      ) : null}
    </div>
  );
}
