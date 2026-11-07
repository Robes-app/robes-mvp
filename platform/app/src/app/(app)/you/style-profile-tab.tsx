'use client';

import { useApi } from '@robes/api-client/react';
import type { Observation } from '@robes/contracts';
import { twin } from '@robes/copy';
import { asSentence } from '@robes/core';
import { DrillList, Eyebrow, Text } from '@robes/ui';
import { ObservationThumbs } from '@/components/observation-thumbs';
import { DrillLink } from '@/components/settings/settings-chrome';
import { useBriefRead } from '@/lib/use-dna';

// Style profile (Felix SettingsView): the one card that asks is an Observation; under it the three
// doors as one drill card. Native twin: features/you/YouMenu.tsx StyleProfile.
export function StyleProfileTab() {
  const { data: dna } = useApi('me.dna.get');
  useBriefRead(dna);
  const first = dna?.observations[0];
  return (
    <div className="flex flex-col gap-3.5">
      {first ? <NoticedCard line={first} /> : null}
      <nav aria-label={twin.tabs.style}>
        <DrillList>
          <DrillLink href="/you/model" label={twin.cards.twin} />
          <DrillLink href="/you/style" label={twin.cards.dna} />
          <DrillLink href="/you/observations" label={twin.cards.observations} />
        </DrillList>
      </nav>
    </div>
  );
}

// The first waiting line, answered with That’s right or Not quite.
function NoticedCard({ line }: { line: Observation }) {
  return (
    <section
      aria-label={twin.noticed.eyebrow}
      className="flex flex-col gap-2.5 rounded-card border border-rule-mid bg-surface-raised px-[22px] pt-5 pb-[18px]"
    >
      <Eyebrow className="text-[9.5px] text-accent-plan">{twin.noticed.eyebrow}</Eyebrow>
      <p className="line-clamp-3 font-display text-[22px] text-ink leading-snug">
        {asSentence(line.text)}
      </p>
      {line.because ? (
        <Text size="small" tone="muted" italic>
          {asSentence(line.because)}
        </Text>
      ) : null}
      <ObservationThumbs line={line} />
    </section>
  );
}
