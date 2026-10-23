'use client';

import { useApi } from '@robes/api-client/react';
import type { BriefLine } from '@robes/contracts';
import { twin } from '@robes/copy';
import { asSentence } from '@robes/core';
import { ErrorText, Eyebrow, IconButton, Progress, Skeleton, Text, useToast } from '@robes/ui';
import { ObservationThumbs } from '@/components/observation-thumbs';
import { errorCopy } from '@/lib/error-copy';
import { useBriefRead, useDnaMutations } from '@/lib/use-dna';

const copy = twin.observations;

const keptIn = (iso: string, now = new Date()): string => {
  const d = new Date(iso);
  const month = d.toLocaleString('en-GB', { month: 'long' });
  return copy.keptIn(d.getFullYear() === now.getFullYear() ? month : `${month} ${d.getFullYear()}`);
};

// What Robes noticed (That’s right / Not quite), then what she kept before — each line removable,
// struck so it is never drafted again.
export function ObservationsView() {
  const query = useApi('me.dna.get');
  const { reading, failed } = useBriefRead(query.data);
  const { removeLine } = useDnaMutations();
  const toast = useToast();
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  const dna = query.data;
  if (!dna) return <Skeleton className="h-64" />;
  const kept: BriefLine[] = [...dna.brief.loves, ...dna.brief.avoids, ...dna.brief.rules].filter(
    (x) => x.source !== 'typed',
  );
  return (
    <div className="flex flex-col gap-8">
      <Text tone="muted">{copy.sub}</Text>
      <section aria-labelledby="obs-since" className="flex flex-col gap-3">
        <Eyebrow id="obs-since">{copy.since}</Eyebrow>
        {reading ? (
          <div className="flex flex-col gap-2" aria-live="polite">
            <Progress stage="reading" />
            <Text size="small" tone="muted">
              {copy.reading}
            </Text>
          </div>
        ) : dna.observations.length ? (
          <ul className="flex flex-col gap-3">
            {dna.observations.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-2 rounded-crisp border border-hairline bg-surface p-5"
              >
                <Eyebrow>{copy.list[o.list] ?? twin.noticed.eyebrow}</Eyebrow>
                <p className="font-display font-light text-ink text-xl">{asSentence(o.text)}</p>
                {o.because ? (
                  <Text size="small" tone="muted" italic>
                    {asSentence(o.because)}
                  </Text>
                ) : null}
                <ObservationThumbs line={o} />
              </li>
            ))}
          </ul>
        ) : (
          <Text tone="muted" italic>
            {failed ? copy.failed : copy.empty}
          </Text>
        )}
      </section>
      {kept.length ? (
        <section aria-labelledby="obs-kept" className="flex flex-col gap-3">
          <Eyebrow id="obs-kept">{copy.keptBefore}</Eyebrow>
          <ul className="flex flex-col rounded-crisp border border-hairline bg-surface px-5">
            {kept.map((x) => (
              <li
                key={x.id}
                className="flex items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0"
              >
                <span className="flex flex-col">
                  <span className="text-ink">{x.text}</span>
                  <span className="text-xs text-ink-muted">{copy.list[x.list]}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-xs text-ink-faint">{keptIn(x.keptAt)}</span>
                  <IconButton
                    icon="close"
                    disabled={removeLine.isPending}
                    label={copy.remove(x.text)}
                    onClick={() =>
                      removeLine
                        .mutateAsync({ params: { id: x.id } })
                        // A failure is already toasted by useDnaMutations.
                        .then(
                          () => toast({ message: copy.removed }),
                          () => {},
                        )
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
