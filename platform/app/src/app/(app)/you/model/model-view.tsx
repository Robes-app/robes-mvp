'use client';

import { useApi } from '@robes/api-client/react';
import type { Facts, Model } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { chosenTones, readAdj } from '@robes/core/avatar';
import { Icon } from '@robes/icons/web';
import { ErrorText, Skeleton, Text } from '@robes/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/settings-chrome';
import { errorCopy } from '@/lib/error-copy';
import { useSelfie, useSelfieRead } from '@/lib/use-selfie';
import {
  Figure,
  Lineup,
  lineSummary,
  type TwinRead,
  twinRead,
  useDrawTwin,
  useModel,
  useModelPick,
} from './twin-parts';

const copy = you.model;
const tw = twin.twinPage;

// You › Your digital twin (legacy 2026-10-20 redline 3a; plan 2026-11-05 §1.4–1.5). On a Robes
// model (3c): its portrait as the hero, Add a selfie as the one commitment, the lineup, and the
// two doors closed. On her own twin (3d): the twin with its retake, the doors — Colouring (one
// selfie) and Body shape (her line, by hand) — and the lineup with her first. Native twin:
// mobile/src/features/you/Model.tsx.
export function ModelView() {
  const query = useModel();
  const style = useApi('me.style.get');
  const dna = useApi('me.dna.get');
  const { pick, pending } = useModelPick();
  const selfie = useSelfie();
  const read = useSelfieRead();
  useDrawTwin('mount');

  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const model = query.data;
  if (!model || !style.data || !dna.data) {
    return <Skeleton className="h-[440px] w-full md:h-[480px] md:rounded-soft" />;
  }
  const onRobes = model.stand?.on === 'robes';
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  const drewHer = twinRead(model, dna.data.facts);
  const error = read.error ?? selfie.error;
  return (
    // ≥1024 the stage holds the left column (430) beside the doors; below it leads, full-bleed.
    <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-[430px_minmax(0,1fr)] lg:items-start lg:gap-12">
      <ModelStage
        model={model}
        facts={dna.data.facts}
        read={drewHer}
        reading={read.reading || selfie.busy}
        onRetake={onRobes ? undefined : selfie.start}
      />
      <div className="flex min-w-0 flex-col gap-[22px]">
        {error ? <ErrorText>{error}</ErrorText> : null}
        {onRobes ? (
          <SettingsGroup id="twin-selfie">
            <SettingsRow
              label={tw.addSelfie}
              sub={tw.addSelfieSub}
              onClick={selfie.start}
              trailing={<Icon name="camera" size={16} className="shrink-0 text-ink" />}
            />
          </SettingsGroup>
        ) : null}
        {/* Colouring and Body shape are the twin's: on a Robes model the doors stand closed. */}
        <div aria-disabled={onRobes || undefined} className={onRobes ? 'opacity-50' : ''}>
          <SettingsGroup id="twin-read" title={onRobes ? undefined : tw.readFrom}>
            <SettingsRow
              {...(onRobes ? {} : { href: '/you/model/colouring' })}
              label={tw.colouring}
              sub={
                colour && !onRobes
                  ? [colour.undertone, colour.contrast].filter(Boolean).join(' · ')
                  : tw.colouringSub
              }
              value={onRobes ? '' : (colour?.season ?? '')}
            />
            <SettingsRow
              {...(onRobes ? {} : { href: '/you/model/body' })}
              label={tw.bodyShape}
              sub={(onRobes ? '' : line) || tw.bodyShapeSub}
            />
          </SettingsGroup>
        </div>
        <Lineup model={model} pick={pick} pending={pending} />
        {/* Her model's own line: what Robes drew her from. One size up — the sans never goes italic.
            With nothing on file the hero already says it, so nothing repeats under the doors. */}
        {onRobes || drewHer === 'none' ? null : (
          <p className="font-display text-ink-faint text-lg italic leading-normal max-lg:text-center">
            {tw.status(model.presence, drewHer)}
          </p>
        )}
      </div>
      {selfie.field}
    </div>
  );
}

// The hero (legacy .tw-stage): 440 tall and flush under the header, full-bleed, on the phone; a
// bordered 480 card on the web. A 90px fade to the ground at its foot carries the caption, which
// sits inside the stage — her colour words, never a shape. On a Robes model, its portrait under a
// `Robes model` eyebrow; on her own, the retake bottom-right.
function ModelStage({
  model,
  facts,
  read,
  reading,
  onRetake,
}: {
  model: Model;
  facts: Facts;
  read: TwinRead;
  reading: boolean;
  onRetake?: () => void;
}) {
  const onRobes = model.stand?.on === 'robes';
  const robesModel = onRobes ? model.robesModels.find((m) => m.n === (model.preset ?? 1)) : null;
  const empty = !onRobes && read === 'none';
  // Nothing on file: the empty figure alone, never a catalog portrait of someone who isn't her.
  const image = onRobes
    ? (model.stand?.imageUrl ?? null)
    : empty
      ? null
      : (model.twin.imageUrl ?? model.cell.imageUrl);
  const chosen = chosenTones(model);
  const caption = onRobes
    ? ''
    : tw.caption(
        chosen.skin === null ? '' : (copy.skinNames[chosen.skin] ?? ''),
        chosen.hair === null ? '' : (copy.hairNames[chosen.hair] ?? ''),
      );
  const drawing = onRobes
    ? robesModel?.status === 'pending'
    : model.twin.status === 'pending' || model.cell.status === 'pending';
  const failed =
    !onRobes &&
    (model.twin.status === 'failed' || (!model.twin.imageUrl && model.cell.status === 'failed'));
  const chip = reading ? tw.reading : drawing ? tw.drawing : null;
  return (
    <div className="flex flex-col gap-2 lg:sticky lg:top-[68px]">
      <figure className="-mx-6 -mt-6 relative h-[440px] overflow-hidden bg-surface-sunk md:mx-0 md:mt-0 md:h-[480px] md:rounded-soft md:border md:border-hairline lg:h-[520px]">
        {/* Her shape under the photograph: the ghost until anything is on file. */}
        {onRobes ? null : (
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
        )}
        {image ? (
          // Signed per viewer; one fixed frame, no renditions.
          // biome-ignore lint/performance/noImgElement: signed URL, fixed hero frame
          <img
            src={image}
            alt={onRobes ? tw.robesModel : copy.imageAlt}
            className={`absolute inset-0 size-full object-cover object-[50%_12%] ${drawing && !onRobes && !model.twin.current ? 'opacity-60' : ''}`}
          />
        ) : onRobes ? (
          <span className="absolute inset-0 flex items-center justify-center text-ink-faint">
            <Icon name="user" size={36} />
          </span>
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-t from-bg to-transparent"
        />
        {onRobes ? (
          <p className="absolute top-4 left-3.5 rounded-pill border border-hairline bg-bg/90 px-3.5 py-2 font-sans text-[9.5px] text-ink uppercase tracking-[0.16em]">
            {tw.robesModel}
          </p>
        ) : null}
        {empty && !reading ? (
          // Nothing on file: the invitation sits in the stage, over the ghost figure.
          <p className="absolute inset-0 flex items-center justify-center px-[34px] text-center font-display text-[15px] text-ink-faint italic leading-[1.6]">
            {tw.stageEmpty}
          </p>
        ) : caption ? (
          <figcaption className="absolute bottom-[18px] left-5 right-16 font-display text-ink text-xl italic leading-[1.35]">
            {caption}
          </figcaption>
        ) : null}
        {chip ? (
          // The chip on the stage while she is drawn (legacy .mv-photo-busy).
          <p
            role="status"
            className="absolute top-4 right-3.5 rounded-pill border border-hairline bg-bg/90 px-3.5 py-2 font-sans text-[9.5px] text-ink uppercase tracking-[0.16em] motion-safe:animate-pulse"
          >
            {chip}
          </p>
        ) : null}
        {onRetake ? (
          // Retake (design 3d): a 32px circle bottom-right, the one way to another selfie.
          <button
            type="button"
            aria-label={tw.retake}
            title={tw.retake}
            onClick={onRetake}
            className="absolute right-3.5 bottom-[18px] flex size-8 items-center justify-center rounded-full border border-hairline bg-bg text-ink after:absolute after:-inset-1.5 after:content-[''] hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <Icon name="camera" size={14} />
          </button>
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
