'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { twin } from '@robes/copy';
import { seasonChoices } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText, Sheet, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { useSelfie } from '@/lib/use-selfie';
import { ColourResult } from '../../style/style-profile';
import { Section, SkinAndHair, useDrawTwin, useModel, useModelPick } from '../twin-parts';

const tw = twin.twinPage;
const rowClass =
  'flex min-h-[60px] w-full items-center justify-between rounded-crisp border px-4 text-left font-display text-xl focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Colouring (legacy redline 3b; plan 2026-11-05 §1.6): her season (the live twelve-season picker)
// and skin and hair as overrides on what her selfie read. The selfie itself is taken a screen
// earlier (the camera is the one door), so no close-up card here. Leaving redraws her twin.
// Native twin: mobile/src/features/you/Colouring.tsx.
export function ColouringView() {
  const query = useModel();
  const style = useApi('me.style.get');
  const { pick } = useModelPick();
  const selfie = useSelfie();
  useDrawTwin('leave');
  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const model = query.data;
  if (!model || !style.data) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="flex flex-col gap-5">
      <Section title={tw.season}>
        <Seasons profile={style.data} onSelfie={selfie.start} />
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

function Seasons({ profile, onSelfie }: { profile: StyleProfile; onSelfie: () => void }) {
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
    // No read yet (a twin shaped by hand): the camera is still the one way to a season.
    return (
      <div className="flex flex-col gap-3">
        <Text size="small" tone="muted">
          {tw.addSeason}
        </Text>
        <Button variant="quiet" className="self-start px-0" onClick={onSelfie}>
          {tw.addSelfie}
        </Button>
      </div>
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
      {/* Another season opens the rest (3f), then reads Fewer seasons. */}
      <button
        type="button"
        aria-expanded={more}
        onClick={() => setMore((m) => !m)}
        className={`${rowClass} border-hairline bg-surface-raised hover:border-ink`}
      >
        {more ? tw.fewerSeasons : tw.anotherSeason}
        <Icon name={more ? 'down' : 'forward'} size={16} className={more ? 'rotate-180' : ''} />
      </button>
      {/* The colour notes sheet (4b): Wear, Go easy on and Metals live here, never inline. */}
      <Sheet open={notes} onOpenChange={setNotes} title={tw.colourNotes}>
        <ColourResult colour={colour} />
      </Sheet>
    </div>
  );
}
