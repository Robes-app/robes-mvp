'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { seasonChoices } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  ErrorText,
  Progress,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { ColourResult, useAnalyse } from '../../style/style-profile';
import { Section, SkinAndHair, useDrawTwin, useModel, useModelPick } from '../twin-parts';

const tw = twin.twinPage;
const style = you.style;
const rowClass =
  'flex min-h-[60px] w-full items-center justify-between rounded-crisp border px-4 text-left font-display text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Colouring (legacy redline 3b): the close-up, her season (the live twelve-season picker) and
// skin and hair as overrides on what the close-up shows. Leaving redraws her twin.
export function ColouringView() {
  const query = useModel();
  const style = useApi('me.style.get');
  const { pick } = useModelPick();
  useDrawTwin('leave');
  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const model = query.data;
  if (!model || !style.data) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="flex flex-col gap-5">
      <Section title={tw.closeUpCard}>
        <CloseUp url={model.closeUpUrl} />
      </Section>
      <Section title={tw.season}>
        <Seasons profile={style.data} />
      </Section>
      <Section title={tw.skinAndHair}>
        <Text size="small" tone="muted">
          {model.closeUpUrl ? tw.skinAndHairRead : tw.skinAndHairHand}
        </Text>
        <SkinAndHair model={model} pick={pick} />
      </Section>
    </div>
  );
}

// Twin of mobile features/you/Colouring.tsx CloseUp (redline 27 Oct, rows 9–11, 31–32): the photo
// 112 × 150 with the re-take as a 32px circle on it; before one, a dashed slot and the screen's one
// commitment, the ink pill. Height comes from the content.
function CloseUp({ url }: { url: string | null }) {
  const { onFile, busy, error } = useAnalyse('colour');
  const input = (
    <input
      id="close-up-photo"
      type="file"
      accept={PHOTO_ACCEPT}
      className="sr-only"
      onChange={(e) => void onFile(e)}
    />
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4">
        {url ? (
          <div className="relative h-[150px] w-[112px]">
            {/* biome-ignore lint/performance/noImgElement: her signed close-up, fixed frame */}
            <img src={url} alt={tw.closeUpCard} className="size-full rounded-lg object-cover" />
            <label
              htmlFor="close-up-photo"
              aria-label={style.retake}
              title={style.retake}
              className="absolute bottom-1.5 left-1.5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-bg text-ink after:absolute after:-inset-1.5 after:content-[''] hover:bg-surface-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring"
            >
              <Icon name="swap" size={14} />
              {input}
            </label>
          </div>
        ) : (
          <span className="flex h-[150px] w-[112px] items-center justify-center rounded-lg border border-border-control border-dashed bg-surface-sunk font-display text-ink-faint text-lg italic">
            {tw.closeUpCard}
          </span>
        )}
        <div className="flex flex-col gap-3">
          <Text size="small" tone="muted">
            {tw.closeUpHelp}
          </Text>
          {url || busy ? null : (
            <label
              htmlFor="close-up-photo"
              className={`${buttonClasses({ variant: 'primary' })} cursor-pointer self-start`}
            >
              {style.choosePhoto}
              {input}
            </label>
          )}
        </div>
      </div>
      {busy ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <Progress stage="reading" />
          <Text size="small" tone="muted">
            {style.reading}
          </Text>
        </div>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

function Seasons({ profile }: { profile: StyleProfile }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [more, setMore] = useState(false);
  const [notes, setNotes] = useState(false);
  const season = useApiMutation('me.style.season', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.style.get'), data),
    onError: () => toast({ message: tw.seasonFailed }),
  });
  const colour = profile.colour;
  if (!colour) {
    return (
      <Text size="small" tone="muted">
        {tw.addSeason}
      </Text>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {seasonChoices(colour.read_season ?? colour.season, more).map((s) => {
        const on = s === colour.season;
        return (
          <div key={s} className="flex flex-col gap-3">
            <button
              type="button"
              aria-pressed={on}
              disabled={season.isPending}
              onClick={() => (on ? null : season.mutate({ input: { season: s } }))}
              className={`${rowClass} ${on ? 'border-selected-line bg-selected' : 'border-hairline hover:border-ink'}`}
            >
              {s}
              {on ? <Icon name="check" size={16} /> : null}
            </button>
            {on ? (
              <div className="flex flex-col gap-3 px-1">
                <div className="flex gap-1" aria-hidden>
                  {colour.palette.slice(0, 9).map((hex) => (
                    // Palette colours are catalog data, the one place colour comes inline.
                    <span
                      key={hex}
                      className="h-6 flex-1 rounded-crisp"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <p className="font-display text-lg text-ink-faint italic">
                  {tw.seasonSummary(
                    [colour.undertone, colour.contrast].filter(Boolean).join(' · '),
                    colour.summary,
                  )}
                </p>
                <Button
                  variant="quiet"
                  className="self-start px-0"
                  aria-haspopup="dialog"
                  onClick={() => setNotes(true)}
                >
                  {tw.colourNotes}
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
      {more ? null : (
        <button
          type="button"
          onClick={() => setMore(true)}
          className={`${rowClass} border-hairline bg-surface-raised hover:border-ink`}
        >
          {tw.anotherSeason}
          <Icon name="forward" size={16} />
        </button>
      )}
      {/* The colour notes sheet (4b): Wear, Go easy on and Metals live here, never inline. */}
      <Sheet open={notes} onOpenChange={setNotes} title={tw.colourNotes}>
        <ColourResult colour={colour} />
      </Sheet>
    </div>
  );
}
