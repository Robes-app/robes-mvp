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
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// You › Your digital twin (legacy 2026-10-20 redline 3a; plan 2026-11-05 §1.4–1.5; redlines
// R1–R11, R15–R18 of 2026-11-05). On a Robes model (3c): its portrait as the hero, Add a selfie
// as the one commitment, then one card holding the lineup and the two doors (closed: Colouring
// and Body shape are the twin's). On her own twin (3d): the twin with its redraw control, the
// doors, and the lineup with her first. Native twin: mobile/src/features/you/Model.tsx.
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
    return <Skeleton className="-mx-6 h-[520px] md:mx-0 md:rounded-soft" />;
  }
  const onRobes = model.stand?.on === 'robes';
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  const drewHer = twinRead(model, dna.data.facts);
  const error = read.error ?? selfie.error;
  const doors = (
    <>
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
    </>
  );
  return (
    // ≥1024 the stage holds the left column (430) beside the doors; below it leads, full-bleed.
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[430px_minmax(0,1fr)] lg:items-start lg:gap-12">
      <ModelStage
        model={model}
        facts={dna.data.facts}
        read={drewHer}
        reading={read.reading || selfie.busy}
        onRetake={onRobes ? undefined : selfie.start}
      />
      <div className="flex min-w-0 flex-col gap-5">
        {error ? <ErrorText>{error}</ErrorText> : null}
        {onRobes ? (
          <>
            {/* R9: the one commitment, a dashed warm row 12px under the picture. */}
            <button
              type="button"
              onClick={selfie.start}
              disabled={selfie.busy}
              className={`flex min-h-[62px] w-full items-center gap-3.5 rounded-soft border border-warm-line border-dashed px-4 py-3 text-left ${focus}`}
              data-testid="twin-add-selfie"
            >
              <Icon name="camera" size={20} className="shrink-0 text-ink-muted" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-ink text-lg leading-tight">{tw.addSelfie}</span>
                <span className="font-light font-sans text-ink-muted text-xs leading-snug">
                  {tw.addSelfieSub}
                </span>
              </span>
              <Icon name="forward" size={16} className="shrink-0 text-ink-muted" />
            </button>
            {/* R10: one card — the lineup over a hairline, then the doors, which stand closed on a
                Robes model (Colouring and Body shape are the twin's). */}
            <SettingsGroup id="twin-read">
              <div className="border-hairline border-b p-4">
                <Lineup model={model} pick={pick} pending={pending} />
              </div>
              <div aria-disabled className="opacity-50">
                {doors}
              </div>
            </SettingsGroup>
          </>
        ) : (
          <>
            <SettingsGroup id="twin-read" title={tw.readFrom}>
              {doors}
            </SettingsGroup>
            <Lineup model={model} pick={pick} pending={pending} />
          </>
        )}
      </div>
      {selfie.field}
    </div>
  );
}

// The hero (redlines R3–R5): 520px tall, full width, the picture covering it — a Robes model held
// at 50% 30%, her twin centred — and a hard edge to the ground beneath. On a Robes model, its tag
// sits bottom-left (R8); on her own, the redraw control bottom-right (R15) and her colour words
// as the caption (R16).
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
      <figure className="-mx-6 relative h-[520px] overflow-hidden bg-surface-sunk md:mx-0 md:rounded-soft">
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
            className={`absolute inset-0 size-full object-cover ${onRobes ? 'object-[50%_30%]' : 'object-center'} ${drawing && !onRobes && !model.twin.current ? 'opacity-60' : ''}`}
          />
        ) : onRobes ? (
          <span className="absolute inset-0 flex items-center justify-center text-ink-faint">
            <Icon name="user" size={36} />
          </span>
        ) : null}
        {onRobes ? (
          // R8: the tag, bottom-left, on glass.
          <p className="absolute bottom-4 left-4 flex h-7 items-center gap-2 rounded-pill bg-veil px-3 backdrop-blur-[22px]">
            <span aria-hidden className="size-1.5 rounded-pill bg-ink-faint" />
            <span className="app-caps text-ink">{tw.robesModel}</span>
          </p>
        ) : null}
        {empty && !reading ? (
          // Nothing on file: the invitation sits in the stage, over the ghost figure.
          <p className="absolute inset-0 flex items-center justify-center px-[34px] text-center font-display text-[15px] text-ink-faint italic leading-[1.6]">
            {tw.stageEmpty}
          </p>
        ) : caption ? (
          // R16: Cormorant italic 300 at 20, 18px from the left and the bottom.
          <figcaption className="absolute bottom-[18px] left-[18px] right-16 font-display font-light text-ink text-xl italic leading-[1.35]">
            {caption}
          </figcaption>
        ) : null}
        {chip ? (
          // The chip on the stage while she is drawn (legacy .mv-photo-busy).
          <p
            role="status"
            className="absolute top-[calc(env(safe-area-inset-top)+14px)] right-3.5 flex h-7 items-center rounded-pill bg-veil px-3 backdrop-blur-[22px] motion-safe:animate-pulse"
          >
            <span className="app-caps text-ink">{chip}</span>
          </p>
        ) : null}
        {onRetake ? (
          // R15: the redraw control — 44px of glass with a lift, 14px from the bottom-right.
          <button
            type="button"
            aria-label={tw.retake}
            title={tw.retake}
            onClick={onRetake}
            className={`absolute right-3.5 bottom-3.5 flex size-11 items-center justify-center rounded-pill bg-veil text-ink shadow-float backdrop-blur-[22px] ${focus}`}
            data-testid="twin-retake"
          >
            <Icon name="refresh" size={18} />
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
