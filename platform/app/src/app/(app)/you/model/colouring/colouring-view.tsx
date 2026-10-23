'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { twin } from '@robes/copy';
import { seasonChoices } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import { ErrorText, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { AnalyseCard, ColourResult } from '../../style/style-profile';
import { Section, SkinAndHair, useDrawTwin, useModel, useModelPick } from '../twin-parts';

const tw = twin.twinPage;
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
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4">
          {model.closeUpUrl ? (
            // biome-ignore lint/performance/noImgElement: her signed close-up, fixed frame
            <img
              src={model.closeUpUrl}
              alt={tw.closeUpCard}
              className="h-[150px] w-[112px] rounded-crisp object-cover"
            />
          ) : (
            <span className="h-[150px] w-[112px] rounded-crisp border border-border-control border-dashed" />
          )}
          <div className="flex flex-col gap-3">
            <Text size="small" tone="muted">
              {tw.closeUpHelp}
            </Text>
            <AnalyseCard kind="colour" profile={style.data} compact />
          </div>
        </div>
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

function Seasons({ profile }: { profile: StyleProfile }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [more, setMore] = useState(false);
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
      {seasonChoices(colour.season, more).map((s) => {
        const on = s === colour.season;
        return (
          <div key={s} className="flex flex-col gap-3">
            <button
              type="button"
              aria-pressed={on}
              disabled={season.isPending}
              onClick={() => (on ? null : season.mutate({ input: { season: s } }))}
              className={`${rowClass} ${on ? 'border-ink bg-surface' : 'border-hairline hover:border-ink'}`}
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
                <details>
                  <summary className="cursor-pointer font-sans text-sm text-ink-muted">
                    {tw.colourNotes}
                  </summary>
                  <div className="pt-3">
                    <ColourResult colour={colour} />
                  </div>
                </details>
              </div>
            ) : null}
          </div>
        );
      })}
      {more ? null : (
        <button
          type="button"
          onClick={() => setMore(true)}
          className={`${rowClass} border-hairline bg-surface font-sans text-base hover:border-ink`}
        >
          {tw.anotherSeason}
          <Icon name="forward" size={16} />
        </button>
      )}
    </div>
  );
}
